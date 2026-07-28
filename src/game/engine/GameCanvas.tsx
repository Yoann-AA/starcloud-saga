import { useEffect, useMemo, useRef } from 'react';
import * as THREE from 'three';
import { Canvas, useFrame, useThree } from '@react-three/fiber';
import { FIXED_DT, KILL_Y, THEMES } from './constants';
import { emit, on } from './events';
import { inputState } from './input';
import { LevelRuntime, ThemeBackdrop, TileField } from './level';
import type { ParallaxHandles } from './level';
import {
  createPlayer, growPlayer, hurtPlayer, killPlayer, playerSnapshot, stepPlayer, stompBounce,
} from './player';
import type { PlayerSim } from './player';
import { rectsOverlap } from './physics';
import PlayerController from './PlayerController';
import { getEntity } from './registry';
import type { EntityInstance } from './registry';
import type { GameContext, LevelData, Rect } from './types';
import Effects from '../fx/Effects';
import { useGameStore } from '../state/store';
import { LEVELS } from '../levels/index';

/** Camera lookahead distance in the run direction (world units). */
const LOOKAHEAD = 2.2;
/** Parallax factors for the three backdrop layers (z=-8/-16/-28). */
const PARALLAX_FACTORS = [0.3, 0.15, 0.05];

interface SimProps {
  level: LevelData;
  runtime: LevelRuntime;
  parallax: ParallaxHandles;
}

/** Headless-ish game loop: fixed 1/120 stepping inside the R3F frame loop. */
function SimRunner({ level, runtime, parallax }: SimProps) {
  const camera = useThree((s) => s.camera);
  const playerRef = useRef<PlayerSim>(createPlayer(level.spawn));
  const entitiesRef = useRef<EntityInstance[]>([]);
  const entityGroup = useRef<THREE.Group>(null);
  const acc = useRef(0);
  const simTime = useRef(0);
  const flagTimer = useRef(-1);
  const pipeCooldown = useRef(0);
  const deathHandled = useRef(false);
  /** castle axe fired (bossDown emitted) — guards against double emission */
  const axeFired = useRef(false);
  const cam = useRef({ x: level.spawn.x, y: 5 });
  /** previous-step AABBs of solid entities (platforms) for carry deltas */
  const solidPrev = useRef(new Map<EntityInstance, Rect>());

  const store = useGameStore;

  // --- spawn entities from the registry (unknown types warn + skip) ---
  useEffect(() => {
    const ctx: GameContext = {
      level,
      player: playerSnapshot(playerRef.current),
      time: 0,
      emit: (type, payload) => emit(type as never, payload as never),
      isSolid: runtime.grid.isSolid,
    };
    const spawned: EntityInstance[] = [];
    for (const e of level.entities) {
      const def = getEntity(e.type);
      if (!def) {
        console.warn(`[engine] unknown entity type "${e.type}" — skipped`);
        continue;
      }
      const inst = def.create(e, ctx);
      spawned.push(inst);
      entityGroup.current?.add(inst.object3D);
    }
    entitiesRef.current = spawned;
    solidPrev.current.clear();
    for (const inst of spawned) {
      if (inst.solid) solidPrev.current.set(inst, inst.aabb());
    }
    return () => {
      for (const inst of spawned) inst.object3D.removeFromParent();
      entitiesRef.current = [];
      solidPrev.current.clear();
    };
  }, [level, runtime]);

  // --- event → store / player wiring ---
  useEffect(() => {
    const unsubs = [
      on('coin', () => {
        store.getState().addCoin(1);
        store.getState().addScore(100);
      }),
      on('oneUp', () => store.getState().addLife()),
      on('score', ({ n }) => store.getState().addScore(n)),
      on('stomp', ({ y }) => {
        store.getState().addScore(100);
        // player-side stomp bounce: only when actually falling onto the
        // stomped entity (entities handle their own squish). Hold-jump = full
        // bounce, per stompBounce. hurtPlayer-style guards keep shots/comet
        // kills from launching a standing player.
        const pl = playerRef.current;
        if (pl.dead || pl.flag) return;
        if (pl.vy < -0.5 && pl.y >= y - 0.6) {
          stompBounce(pl, inputState.jump);
        }
      }),
      // entity contact damage → player hurt/shrink/death (hurtPlayer already
      // guards hurt-invuln, comet invincibility, death and flag states)
      on('damage', () => {
        const pl = playerRef.current;
        const result = hurtPlayer(pl);
        if (result === 'died') emit('death', undefined);
      }),
      on('powerupCollect', ({ kind }) => {
        const pl = playerRef.current;
        if (pl.dead || pl.flag) return;
        if (kind === 'berry') {
          // grow; if already grown the 1000 pts the item emitted covers it
          if (pl.power === 'small') growPlayer(pl, 'berry');
        } else if (kind === 'ember' || kind === 'comet') {
          growPlayer(pl, kind); // comet also starts timed invincibility
        }
        // oneUp flows through the separate oneUp event
      }),
    ];
    return () => unsubs.forEach((u) => u());
  }, [store]);

  // --- fixed-step simulation ---
  useFrame((_state, frameDt) => {
    const status = store.getState().run.status;
    if (status === 'paused' || status === 'gameover' || status === 'win') return;

    const p = playerRef.current;
    acc.current = Math.min(acc.current + Math.min(frameDt, 0.1), FIXED_DT * 16);

    while (acc.current >= FIXED_DT) {
      acc.current -= FIXED_DT;

      if (status === 'playing' || status === 'dead' || status === 'complete') {
        simTime.current += FIXED_DT;
        stepPlayer(p, inputState, runtime.grid, level, FIXED_DT, {
          onHeadHit: (tx, ty, ch) => {
            if (ch === '?') {
              runtime.setTile(tx, ty, 'u');
              emit('coin', undefined);
            } else if (ch === 'M' || ch === 'F' || ch === 'S' || ch === 'U') {
              runtime.setTile(tx, ty, 'u');
              const kind = ch === 'M' ? 'berry' : ch === 'F' ? 'ember' : ch === 'S' ? 'comet' : 'oneUp';
              if (ch === 'U') emit('oneUp', undefined);
              else emit('powerupSpawn', { kind, x: tx + 0.5, y: ty + 1 });
            } else if (ch === 'B') {
              if (p.power !== 'small') {
                runtime.clearTile(tx, ty);
                emit('brickBreak', { x: tx + 0.5, y: ty + 0.5 });
                emit('score', { n: 50 });
              }
            }
          },
          onCoin: (tx, ty) => {
            runtime.clearTile(tx, ty);
            emit('coin', undefined);
          },
          onSpring: (x, y) => emit('spring', { x, y }),
          onHazard: () => {
            // lava / spikes = instant death regardless of power
            if (!p.dead) {
              killPlayer(p);
              p.vy = 0;
              emit('death', undefined);
            }
          },
          onCheckpoint: (x, y) => {
            p.checkpoint = { x: x + 0.5, y: y + 1 };
            emit('checkpoint', { x, y });
          },
          onFlag: (height01) => {
            emit('flagGrab', { height01 });
            flagTimer.current = 0;
            // castle level reached its end without touching the axe (e.g.
            // jumped clean over it): still collapse the boss bridge
            if (!axeFired.current && level.tiles.some((row) => row.includes('X'))) {
              axeFired.current = true;
              emit('bossDown', undefined);
            }
          },
          onAxe: () => {
            // castle axe tile: collapse the boss bridge; the flag outro
            // flow (levelComplete) follows via the onFlag hook above
            if (axeFired.current) return;
            axeFired.current = true;
            emit('bossDown', undefined);
          },
        });

        // --- ember shot: X key, ember power only, small cooldown ---
        if (
          status === 'playing' &&
          inputState.shoot &&
          !p.dead &&
          !p.flag &&
          p.power === 'ember' &&
          p.shootCooldown <= 0
        ) {
          p.shootCooldown = 0.25;
          emit('shoot', undefined);
        }

        // pipe-enter hook: down key on a pipe with a destination warps Pip
        pipeCooldown.current = Math.max(0, pipeCooldown.current - FIXED_DT);
        if (inputState.down && p.onGround && !p.dead && !p.flag && pipeCooldown.current <= 0) {
          const centerTx = Math.floor(p.x + p.w / 2);
          for (const pipe of level.pipes) {
            if (!pipe.dest) continue;
            if (centerTx >= pipe.x && centerTx <= pipe.x + 1 && Math.abs(p.y - pipe.top) < 0.25) {
              emit('pipeEnter', { x: pipe.x, y: pipe.top });
              p.x = pipe.dest.x;
              p.y = pipe.dest.y;
              p.vx = 0;
              p.vy = 0;
              pipeCooldown.current = 1;
              break;
            }
          }
        }

        // entity updates (none in scaffold; pods register real ones)
        const ctx: GameContext = {
          level,
          player: playerSnapshot(p),
          time: simTime.current,
          emit: (type, payload) => emit(type as never, payload as never),
          isSolid: runtime.grid.isSolid,
        };
        for (const inst of entitiesRef.current) inst.update(FIXED_DT, ctx);

        // --- solid entities (moving/falling platforms): collide + carry ---
        for (const inst of entitiesRef.current) {
          if (!inst.solid) continue;
          const r = inst.aabb();
          const prev = solidPrev.current.get(inst);
          solidPrev.current.set(inst, r);
          if (!inst.object3D.visible) continue; // respawning fall platform
          if (p.dead || p.flag) continue;

          // carry: player was resting on this platform's top last step —
          // apply the platform's per-step delta before resolving overlap
          if (prev && p.onGround) {
            const feetOnPrevTop = Math.abs(p.y - (prev.y + prev.h)) < 0.12;
            const xOverlapPrev = p.x + p.w > prev.x + 0.05 && p.x < prev.x + prev.w - 0.05;
            if (feetOnPrevTop && xOverlapPrev) {
              p.x += r.x - prev.x;
              p.y += r.y - prev.y;
            }
          }

          if (!rectsOverlap(p, r)) continue;
          // minimal-axis AABB resolution
          const overlapX = Math.min(p.x + p.w, r.x + r.w) - Math.max(p.x, r.x);
          const overlapY = Math.min(p.y + p.h, r.y + r.h) - Math.max(p.y, r.y);
          if (overlapY <= overlapX) {
            if (p.y + p.h / 2 >= r.y + r.h / 2) {
              p.y = r.y + r.h; // land on top
              if (p.vy < 0) p.vy = 0;
              p.onGround = true;
            } else {
              p.y = r.y - p.h; // bonk underside
              if (p.vy > 0) p.vy = 0;
            }
          } else if (p.x + p.w / 2 < r.x + r.w / 2) {
            p.x = r.x - p.w - 1e-6; // side-block from the left
            if (p.vx > 0) p.vx = 0;
          } else {
            p.x = r.x + r.w + 1e-6; // side-block from the right
            if (p.vx < 0) p.vx = 0;
          }
        }

        // level timer
        if (status === 'playing' && !p.flag) {
          const left = Math.max(0, level.timeLimit - Math.floor(simTime.current));
          if (left !== store.getState().run.timeLeft) store.getState().setTimeLeft(left);
          if (left <= 0 && !p.dead) {
            killPlayer(p);
            p.vy = 0;
            emit('death', undefined);
          }
        }
      }
    }

    // --- death / respawn flow ---
    if (p.dead && !deathHandled.current) {
      deathHandled.current = true;
      store.getState().loseLife();
      store.getState().setStatus('dead');
    }
    if (p.dead && p.deathTimer > 2.2) {
      const s = store.getState();
      if (s.run.lives > 0) {
        const at = p.checkpoint ?? level.spawn;
        playerRef.current = createPlayer(at);
        playerRef.current.checkpoint = p.checkpoint;
        deathHandled.current = false;
        simTime.current = 0;
        s.setTimeLeft(level.timeLimit);
        s.setStatus('playing');
      } else if (s.run.status !== 'gameover') {
        s.setStatus('gameover');
        emit('gameOver', undefined);
      }
    }

    // --- flag outro → level complete ---
    if (p.flag && flagTimer.current >= 0) {
      flagTimer.current += frameDt;
      if (flagTimer.current > 2.2 && store.getState().run.status !== 'complete') {
        const s = store.getState();
        const clearTime = simTime.current;
        const coins = s.run.coins;
        const stars =
          1 +
          (clearTime <= level.parTime ? 1 : 0) +
          (p.flagHeight01 > 0.55 ? 1 : 0);
        s.unlockNext(level.id, stars);
        s.recordCoins(level.id, coins);
        s.setStatus('complete');
        emit('levelComplete', undefined);
        if (LEVELS.findIndex((m) => m.id === level.id) === LEVELS.length - 1 && LEVELS.length > 1) {
          s.setStatus('win');
        }
      }
    }

    // --- expose player power state to the store (HUD chip reads it) ---
    if (store.getState().run.power !== playerRef.current.power) {
      store.getState().setPower(playerRef.current.power);
    }

    // --- camera rig: side 2.5D follow + lookahead + y deadzone + parallax ---
    const targetX = THREE.MathUtils.clamp(
      p.x + p.w / 2 + p.facing * LOOKAHEAD,
      7,
      Math.max(8, level.width - 7),
    );
    const k = 1 - Math.exp(-frameDt * 5.5);
    cam.current.x += (targetX - cam.current.x) * k;
    // vertical deadzone: only track when the player leaves a ±2 tile band
    const dy = p.y + 1 - cam.current.y;
    if (Math.abs(dy) > 2) cam.current.y += (Math.abs(dy) - 2) * Math.sign(dy) * k;
    cam.current.y = THREE.MathUtils.clamp(cam.current.y, 4.5, Math.max(5, level.height - 3));

    camera.position.set(cam.current.x, cam.current.y, 14);
    camera.lookAt(cam.current.x, cam.current.y, 0);

    parallax.layers.forEach((layer, i) => {
      if (layer) layer.position.x = cam.current.x * (1 - PARALLAX_FACTORS[i]);
    });
  });

  return (
    <>
      <group ref={entityGroup} />
      <PlayerController sim={playerRef} />
    </>
  );
}

/** R3F canvas for one level. Keyed by level id in Game.tsx. */
export default function GameCanvas({ level }: { level: LevelData }) {
  const theme = THEMES[level.theme];
  const runtime = useMemo(() => new LevelRuntime(level), [level]);
  const parallax = useMemo<ParallaxHandles>(() => ({ layers: [null, null, null] }), []);

  return (
    <Canvas
      style={{ position: 'absolute', top: 0, left: 0, width: '100%', height: '100%' }}
      camera={{ fov: 45, position: [level.spawn.x, 5, 14], near: 0.1, far: 250 }}
      dpr={[1, 2]}
      gl={{ antialias: true }}
      shadows={false}
    >
      <fog attach="fog" args={[theme.fog, 40, 120]} />
      <hemisphereLight args={[theme.ambient, theme.groundDark, 0.9]} />
      <directionalLight position={[-6, 12, 8]} intensity={1.6} color="#FFF2D9" />
      <ThemeBackdrop theme={level.theme} levelWidth={level.width} parallax={parallax} />
      <TileField runtime={runtime} />
      <SimRunner level={level} runtime={runtime} parallax={parallax} />
      <Effects />
      {/* invisible safety plane visual cue at the kill plane (subtle) */}
      <mesh position={[level.width / 2, KILL_Y - 2, -10]}>
        <planeGeometry args={[level.width * 2, 4]} />
        <meshBasicMaterial color="#1B1233" transparent opacity={0.35} />
      </mesh>
    </Canvas>
  );
}
