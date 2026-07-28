import {
  ACCEL, COYOTE, FRICTION, GRAVITY, JUMP_BUFFER, JUMP_CUTOFF_MULT, JUMP_VEL,
  KILL_Y, MAX_FALL, PLAYER_GROWN, PLAYER_SMALL, RUN_MAX, SPRING_VEL,
  STOMP_BOUNCE_MULT, WALK_MAX,
} from './constants';
import { makeBody, moveAndCollide, rectsOverlap } from './physics';
import type { Body, SolidGrid } from './physics';
import type { InputState, LevelData, PlayerAnim, PlayerSnapshot, PowerState, Vec2 } from './types';

export interface PlayerSim extends Body {
  facing: 1 | -1;
  power: PowerState;
  coyote: number;
  jumpBuffer: number;
  prevJump: boolean;
  jumpCutApplied: boolean;
  skid: boolean;
  anim: PlayerAnim;
  dead: boolean;
  deathTimer: number;
  flag: boolean;
  flagHeight01: number;
  invincibleT: number;
  hurtT: number;
  shootCooldown: number;
  checkpoint: Vec2 | null;
}

/** Optional hooks the host (browser or sim) uses to react to world interactions. */
export interface PlayerHooks {
  onHeadHit?: (tx: number, ty: number, tileChar: string) => void;
  onCoin?: (tx: number, ty: number) => void;
  onSpring?: (tx: number, ty: number) => void;
  onHazard?: () => void;
  onCheckpoint?: (x: number, y: number) => void;
  onFlag?: (height01: number) => void;
  /** castle axe ('X' tile) touched — host should emit bossDown */
  onAxe?: () => void;
  onDeath?: () => void;
  onJump?: () => void;
}

export function createPlayer(spawn: Vec2, power: PowerState = 'small'): PlayerSim {
  const size = power === 'small' ? PLAYER_SMALL : PLAYER_GROWN;
  const body = makeBody(spawn.x, spawn.y, size.w, size.h);
  return {
    ...body,
    facing: 1,
    power,
    coyote: 0,
    jumpBuffer: 0,
    prevJump: false,
    jumpCutApplied: false,
    skid: false,
    anim: 'idle',
    dead: false,
    deathTimer: 0,
    flag: false,
    flagHeight01: 0,
    invincibleT: 0,
    hurtT: 0,
    shootCooldown: 0,
    checkpoint: null,
  };
}

export function playerSnapshot(p: PlayerSim): PlayerSnapshot {
  return {
    x: p.x, y: p.y, w: p.w, h: p.h, vx: p.vx, vy: p.vy,
    onGround: p.onGround, facing: p.facing, power: p.power, anim: p.anim,
    invincible: p.invincibleT > 0 || p.hurtT > 0,
    invincibleKind: p.invincibleT > 0 ? 'comet' : p.hurtT > 0 ? 'hurt' : null,
    dead: p.dead,
  };
}

/** Damage the player: shrink if powered, die if small. Returns 'shrank' | 'died' | 'ignored'. */
export function hurtPlayer(p: PlayerSim): 'shrank' | 'died' | 'ignored' {
  if (p.invincibleT > 0 || p.hurtT > 0 || p.dead || p.flag) return 'ignored';
  if (p.power !== 'small') {
    p.power = 'small';
    p.w = PLAYER_SMALL.w;
    p.h = PLAYER_SMALL.h;
    p.hurtT = 2;
    return 'shrank';
  }
  killPlayer(p);
  return 'died';
}

export function killPlayer(p: PlayerSim): void {
  if (p.dead) return;
  p.dead = true;
  p.anim = 'dead';
  p.deathTimer = 0;
  p.vx = 0;
  p.vy = JUMP_VEL * 0.7; // classic death pop
}

export function growPlayer(p: PlayerSim, kind: PowerState): void {
  if (p.dead || p.flag) return;
  p.power = kind;
  if (kind !== 'small') {
    const dh = PLAYER_GROWN.h - p.h;
    p.w = PLAYER_GROWN.w;
    p.h = PLAYER_GROWN.h;
    p.y += Math.max(0, dh); // grow upward, keep feet planted
  }
  if (kind === 'comet') p.invincibleT = 10;
}

/** Bounce after stomping an enemy. Full jump velocity when jump held, else 60%. */
export function stompBounce(p: PlayerSim, jumpHeld: boolean): void {
  p.vy = JUMP_VEL * (jumpHeld ? 1 : STOMP_BOUNCE_MULT);
  p.onGround = false;
  p.jumpCutApplied = false;
}

const EMPTY_INPUT: InputState = { left: false, right: false, jump: false, run: false, down: false, shoot: false };

/**
 * Advance the player one fixed step. Pure: only touches `p`, reads input/grid.
 * World mutations (coins collected, blocks changed) are reported via hooks.
 */
export function stepPlayer(
  p: PlayerSim,
  input: InputState,
  grid: SolidGrid,
  level: LevelData,
  dt: number,
  hooks: PlayerHooks = {},
): PlayerSim {
  // --- death sequence: pop up, fall through the world ---
  if (p.dead) {
    p.deathTimer += dt;
    if (p.deathTimer > 0.25) p.vy -= GRAVITY * dt;
    p.y += p.vy * dt;
    return p;
  }

  // --- flag grabbed: auto walk right (castle outro handled by host) ---
  if (p.flag) {
    p.vx = WALK_MAX * 0.5;
    p.vy = Math.max(p.vy - GRAVITY * dt, -MAX_FALL);
    moveAndCollide(p, grid, dt);
    p.anim = p.onGround ? 'run' : 'fall';
    return p;
  }

  // timers
  p.coyote = Math.max(0, p.coyote - dt);
  p.jumpBuffer = Math.max(0, p.jumpBuffer - dt);
  p.invincibleT = Math.max(0, p.invincibleT - dt);
  p.hurtT = Math.max(0, p.hurtT - dt);
  p.shootCooldown = Math.max(0, p.shootCooldown - dt);

  // --- horizontal ---
  const maxSpeed = input.run ? RUN_MAX : WALK_MAX;
  const dir = (input.right ? 1 : 0) - (input.left ? 1 : 0);
  p.skid = false;
  if (dir !== 0) {
    if (p.onGround && Math.sign(p.vx) === -dir && Math.abs(p.vx) > WALK_MAX * 0.6) {
      p.skid = true;
      p.vx += dir * FRICTION * 2.4 * dt;
    } else {
      p.vx += dir * ACCEL * dt;
      // hard clamp: held-run speed may never exceed the cap (contract RUN_MAX)
      if (Math.abs(p.vx) > maxSpeed) p.vx = maxSpeed * Math.sign(p.vx);
    }
    p.facing = dir as 1 | -1;
    if (Math.abs(p.vx) > maxSpeed) {
      // ease back toward cap (allows stomp/spring overspeed to decay gracefully)
      p.vx = Math.max(maxSpeed, Math.abs(p.vx) - FRICTION * dt) * Math.sign(p.vx);
    }
  } else {
    const f = FRICTION * dt * (p.onGround ? 1 : 0.35);
    if (Math.abs(p.vx) <= f) p.vx = 0;
    else p.vx -= Math.sign(p.vx) * f;
  }

  // --- jumping: buffer + coyote + variable height ---
  if (input.jump && !p.prevJump) p.jumpBuffer = JUMP_BUFFER;
  if (p.onGround) p.coyote = COYOTE;
  if (p.jumpBuffer > 0 && (p.onGround || p.coyote > 0)) {
    p.vy = JUMP_VEL;
    p.onGround = false;
    p.coyote = 0;
    p.jumpBuffer = 0;
    p.jumpCutApplied = false;
    hooks.onJump?.();
  }
  if (!input.jump && p.vy > 0 && !p.jumpCutApplied) {
    p.vy *= JUMP_CUTOFF_MULT;
    p.jumpCutApplied = true;
  }
  p.prevJump = input.jump;

  // --- gravity: lighter while rising with jump held (derives the contracted
  // ≈4.2-tile jump), full weight on the way down for a snappy fall ---
  const ascentGravity = p.vy > 0 && input.jump ? GRAVITY * 0.55 : GRAVITY;
  p.vy = Math.max(p.vy - ascentGravity * dt, -MAX_FALL);

  // --- integrate & collide ---
  moveAndCollide(p, grid, dt);

  if (p.hitHead && p.headTileX >= 0) {
    hooks.onHeadHit?.(p.headTileX, p.headTileY, grid.tileAt(p.headTileX, p.headTileY));
  }

  // --- tile triggers at player position ---
  const cx = p.x + p.w / 2;
  const feetTy = Math.floor(p.y + 0.05);
  const centerTx = Math.floor(cx);

  // spring: standing on (or overlapping) a 'J' tile
  const springBelow = grid.tileAt(centerTx, feetTy - 1);
  const springHere = grid.tileAt(centerTx, feetTy);
  if (p.vy <= 0.1 && (springBelow === 'J' || springHere === 'J')) {
    p.vy = SPRING_VEL;
    p.onGround = false;
    p.jumpCutApplied = false;
    hooks.onSpring?.(centerTx, springBelow === 'J' ? feetTy - 1 : feetTy);
  }

  // overlap scan of the cells the body covers (coins, lava, checkpoint)
  const x0 = Math.floor(p.x);
  const x1 = Math.floor(p.x + p.w - 1e-9);
  const y0 = Math.floor(p.y);
  const y1 = Math.floor(p.y + p.h - 1e-9);
  for (let ty = y0; ty <= y1; ty++) {
    for (let tx = x0; tx <= x1; tx++) {
      const ch = grid.tileAt(tx, ty);
      if (ch === 'o') hooks.onCoin?.(tx, ty);
      else if (ch === '^') hooks.onHazard?.();
      else if (ch === 'C' && !p.checkpoint) hooks.onCheckpoint?.(tx, ty);
    }
  }

  // --- kill plane ---
  if (p.y < KILL_Y) {
    killPlayer(p);
    p.vy = 0; // falling into a pit: no pop
    hooks.onDeath?.();
    return p;
  }

  // --- castle axe ('X' tile): touching the switch collapses the boss bridge
  // and starts the same outro as the flagpole. 'X' is solid, so "overlap"
  // means pressed against it / standing on it — scan the body box inflated
  // by a small epsilon ---
  if (!p.flag) {
    const ax0 = Math.floor(p.x - 0.06);
    const ax1 = Math.floor(p.x + p.w + 0.06 - 1e-9);
    const ay0 = Math.floor(p.y - 0.06);
    const ay1 = Math.floor(p.y + p.h + 0.06 - 1e-9);
    let axe = false;
    for (let ty = ay0; ty <= ay1 && !axe; ty++) {
      for (let tx = ax0; tx <= ax1; tx++) {
        if (grid.tileAt(tx, ty) === 'X') {
          axe = true;
          break;
        }
      }
    }
    if (axe) {
      p.flag = true;
      p.vx = 0;
      p.flagHeight01 = Math.max(0, Math.min(1, p.y / Math.max(1, level.height - 4)));
      p.anim = 'win';
      hooks.onAxe?.();
      hooks.onFlag?.(p.flagHeight01);
      return p;
    }
  }

  // --- flagpole ---
  if (!p.flag && p.x + p.w >= level.flagX) {
    p.flag = true;
    p.x = Math.min(p.x, level.flagX - p.w);
    p.vx = 0;
    p.flagHeight01 = Math.max(0, Math.min(1, p.y / Math.max(1, level.height - 4)));
    p.anim = 'win';
    hooks.onFlag?.(p.flagHeight01);
    return p;
  }

  // --- animation state ---
  if (!p.onGround) p.anim = p.vy > 0 ? 'jump' : 'fall';
  else if (p.skid) p.anim = 'skid';
  else if (Math.abs(p.vx) > 0.2) p.anim = 'run';
  else if (input.down) p.anim = 'crouch';
  else p.anim = 'idle';

  return p;
}

export const NO_INPUT = EMPTY_INPUT;

export { rectsOverlap };
