// FX SEAM — POD-AUDIOFX implementation.
// Pooled particle systems INSIDE the R3F canvas, driven purely by the engine
// event bus (engine-api.md behavior contract). Two instanced-quad pools:
// an additive pool (sparkles/glows/trail/explosions) and a solid pool
// (debris, puffs, confetti). ≤8 concurrent bursts; everything is disposed
// on unmount.

import { useEffect, useMemo, useRef } from 'react';
import type { JSX } from 'react';
import * as THREE from 'three';
import { useFrame, useThree } from '@react-three/fiber';
import { on } from '../engine/events';

const ADD_MAX = 420;
const SOLID_MAX = 260;
const MAX_BURSTS = 8;
/** Comet invincibility duration (matches engine power-up timing). */
const TRAIL_SECONDS = 10;

interface Particle {
  alive: boolean;
  x: number; y: number; z: number;
  vx: number; vy: number; vz: number;
  life: number; maxLife: number;
  size: number;
  gravity: number;
  drag: number;
  spin: number;
  rot: number;
  r: number; g: number; b: number;
}

interface SpawnOpts {
  x: number; y: number; z?: number;
  count: number;
  color: THREE.Color | THREE.Color[];
  speed: [number, number]; // min,max
  up?: number; // upward bias
  life: [number, number];
  size: [number, number];
  gravity?: number;
  drag?: number;
  spread?: number; // positional jitter
}

function makeParticles(max: number): Particle[] {
  return Array.from({ length: max }, () => ({
    alive: false, x: 0, y: 0, z: 0, vx: 0, vy: 0, vz: 0,
    life: 0, maxLife: 1, size: 0, gravity: 0, drag: 1, spin: 0, rot: 0,
    r: 1, g: 1, b: 1,
  }));
}

interface Pool {
  mesh: THREE.InstancedMesh;
  particles: Particle[];
  cursor: number;
}

const dummy = new THREE.Object3D();
const tmpColor = new THREE.Color();

function spawnInto(pool: Pool, o: SpawnOpts): void {
  for (let i = 0; i < o.count; i++) {
    const p = pool.particles[pool.cursor];
    pool.cursor = (pool.cursor + 1) % pool.particles.length;
    const angle = Math.random() * Math.PI * 2;
    const speed = o.speed[0] + Math.random() * (o.speed[1] - o.speed[0]);
    const spread = o.spread ?? 0.15;
    p.alive = true;
    p.x = o.x + (Math.random() - 0.5) * spread;
    p.y = o.y + (Math.random() - 0.5) * spread;
    p.z = (o.z ?? 0.3) + (Math.random() - 0.5) * 0.2;
    p.vx = Math.cos(angle) * speed;
    p.vy = Math.sin(angle) * speed + (o.up ?? 0);
    p.vz = (Math.random() - 0.5) * 1.5;
    p.maxLife = o.life[0] + Math.random() * (o.life[1] - o.life[0]);
    p.life = p.maxLife;
    p.size = o.size[0] + Math.random() * (o.size[1] - o.size[0]);
    p.gravity = o.gravity ?? 0;
    p.drag = o.drag ?? 0.98;
    p.spin = (Math.random() - 0.5) * 10;
    p.rot = Math.random() * Math.PI * 2;
    const c = Array.isArray(o.color)
      ? o.color[Math.floor(Math.random() * o.color.length)]
      : o.color;
    p.r = c.r; p.g = c.g; p.b = c.b;
  }
}

function updatePool(pool: Pool, dt: number): void {
  const { mesh, particles } = pool;
  for (let i = 0; i < particles.length; i++) {
    const p = particles[i];
    if (p.alive) {
      p.life -= dt;
      if (p.life <= 0) {
        p.alive = false;
      } else {
        p.vy -= p.gravity * dt;
        p.vx *= p.drag;
        p.vy *= p.drag;
        p.x += p.vx * dt;
        p.y += p.vy * dt;
        p.z += p.vz * dt;
        p.rot += p.spin * dt;
        const t = p.life / p.maxLife;
        const s = p.size * (t < 0.7 ? t / 0.7 : (1 - t) / 0.3 * 0.9 + 0.1);
        dummy.position.set(p.x, p.y, p.z);
        dummy.rotation.set(0, 0, p.rot);
        dummy.scale.setScalar(Math.max(0.0001, s));
        dummy.updateMatrix();
        mesh.setMatrixAt(i, dummy.matrix);
        mesh.setColorAt(i, tmpColor.setRGB(p.r, p.g, p.b));
        continue;
      }
    }
    // dead: collapse to zero
    dummy.position.set(0, -999, 0);
    dummy.rotation.set(0, 0, 0);
    dummy.scale.setScalar(0.0001);
    dummy.updateMatrix();
    mesh.setMatrixAt(i, dummy.matrix);
  }
  mesh.instanceMatrix.needsUpdate = true;
  if (mesh.instanceColor) mesh.instanceColor.needsUpdate = true;
}

const CREAM = new THREE.Color('#FFF6E8');
const GOLD = new THREE.Color('#FFC93C');
const STAR_DEEP = new THREE.Color('#E8A50F');
const BERRY = new THREE.Color('#FF5D7E');
const MINT = new THREE.Color('#59D99C');
const SKY = new THREE.Color('#4FC4FF');
const LAVA = new THREE.Color('#FF6B35');
const VIOLET = new THREE.Color('#9B7BFF');
const BRICK = new THREE.Color('#C96F3B');
const BRICK_DARK = new THREE.Color('#8A4A2B');
const CONFETTI = [GOLD, BERRY, SKY, MINT, VIOLET, CREAM];
const KIND_COLORS: Record<string, THREE.Color> = {
  berry: BERRY, ember: LAVA, comet: VIOLET, oneUp: BERRY,
};

/** Locate Pip's group in the scene (the only ShapeGeometry star lives on his chest). */
function findPlayerGroup(scene: THREE.Scene): THREE.Object3D | null {
  let found: THREE.Object3D | null = null;
  scene.traverse((o) => {
    if (found) return;
    const mesh = o as THREE.Mesh;
    if (mesh.isMesh && mesh.geometry && mesh.geometry.type === 'ShapeGeometry') {
      found = o.parent?.parent ?? o.parent ?? null;
    }
  });
  return found;
}

export default function Effects(): JSX.Element | null {
  const scene = useThree((s) => s.scene);
  const camera = useThree((s) => s.camera);

  const addGeo = useMemo(() => new THREE.PlaneGeometry(1, 1), []);
  const addMat = useMemo(
    () =>
      new THREE.MeshBasicMaterial({
        transparent: true,
        depthWrite: false,
        side: THREE.DoubleSide,
        blending: THREE.AdditiveBlending,
        toneMapped: false,
      }),
    [],
  );
  const solidGeo = useMemo(() => new THREE.PlaneGeometry(1, 1), []);
  const solidMat = useMemo(
    () =>
      new THREE.MeshBasicMaterial({
        transparent: true,
        depthWrite: false,
        side: THREE.DoubleSide,
        toneMapped: false,
      }),
    [],
  );

  const addMeshRef = useRef<THREE.InstancedMesh>(null);
  const solidMeshRef = useRef<THREE.InstancedMesh>(null);
  const poolsRef = useRef<{ add: Pool; solid: Pool } | null>(null);
  const burstsRef = useRef(0);
  const timersRef = useRef<number[]>([]);
  const playerRef = useRef<THREE.Object3D | null>(null);
  const lastPosRef = useRef({ x: 0, y: 4 });
  const trailUntilRef = useRef(0);
  const trailHueRef = useRef(0);
  const clockRef = useRef(0);

  useEffect(() => {
    return () => {
      addGeo.dispose();
      addMat.dispose();
      solidGeo.dispose();
      solidMat.dispose();
      timersRef.current.forEach((t) => window.clearTimeout(t));
      timersRef.current = [];
    };
  }, [addGeo, addMat, solidGeo, solidMat]);

  /** current best guess of Pip's world position (event payload > scene lookup > last seen) */
  const playerPos = (): { x: number; y: number } => {
    if (playerRef.current) {
      return { x: playerRef.current.position.x, y: playerRef.current.position.y };
    }
    return lastPosRef.current;
  };

  useEffect(() => {
    /** spawn a burst if under the concurrency cap; auto-releases its slot */
    const burst = (pool: 'add' | 'solid', o: SpawnOpts): void => {
      if (burstsRef.current >= MAX_BURSTS) return;
      const pools = poolsRef.current;
      if (!pools) return;
      burstsRef.current += 1;
      const release = window.setTimeout(() => {
        burstsRef.current = Math.max(0, burstsRef.current - 1);
      }, Math.max(...o.life) * 1000 + 120);
      timersRef.current.push(release);
      spawnInto(pools[pool], o);
    };

    const remember = (x: number, y: number): void => {
      lastPosRef.current = { x, y };
    };

    const unsubs = [
      // coin sparkle burst — gold shimmer at the collector
      on('coin', () => {
        const p = playerPos();
        burst('add', {
          x: p.x, y: p.y + 0.6, count: 10, color: [GOLD, STAR_DEEP, CREAM],
          speed: [1, 3.2], up: 2.2, life: [0.3, 0.6], size: [0.08, 0.2], gravity: 4,
        });
      }),
      // stomp puff — 3+ cream dust puffs
      on('stomp', ({ x, y }) => {
        remember(x, y);
        burst('solid', {
          x, y: y + 0.1, count: 5, color: CREAM,
          speed: [1.5, 3], up: 1, life: [0.25, 0.45], size: [0.18, 0.34], drag: 0.9,
        });
      }),
      // brick debris — 4+ shards with gravity
      on('brickBreak', ({ x, y }) => {
        remember(x, y);
        burst('solid', {
          x, y, count: 8, color: [BRICK, BRICK_DARK, LAVA],
          speed: [2, 5], up: 4, life: [0.5, 0.9], size: [0.12, 0.24], gravity: 22, drag: 0.995,
        });
      }),
      // power-up glow — soft rising ring, tinted by kind
      on('powerupSpawn', ({ kind, x, y }) => {
        remember(x, y);
        burst('add', {
          x, y: y + 0.3, count: 12, color: KIND_COLORS[kind] ?? GOLD,
          speed: [0.4, 1.2], up: 1.6, life: [0.5, 1], size: [0.1, 0.22], drag: 0.96,
        });
      }),
      on('powerupCollect', ({ kind }) => {
        const p = playerPos();
        burst('add', {
          x: p.x, y: p.y + 0.4, count: 16, color: KIND_COLORS[kind] ?? GOLD,
          speed: [1, 3], up: 1.5, life: [0.4, 0.8], size: [0.1, 0.24], gravity: -1,
        });
        if (kind === 'comet') trailUntilRef.current = clockRef.current + TRAIL_SECONDS;
      }),
      on('damage', () => {
        trailUntilRef.current = 0;
        const p = playerPos();
        burst('solid', {
          x: p.x, y: p.y + 0.4, count: 6, color: [BERRY, CREAM],
          speed: [1.5, 3], up: 2, life: [0.3, 0.5], size: [0.12, 0.2], gravity: 8,
        });
      }),
      on('death', () => {
        trailUntilRef.current = 0;
        const p = playerPos();
        burst('add', {
          x: p.x, y: p.y + 0.5, count: 20, color: [BERRY, VIOLET, CREAM],
          speed: [1, 4], up: 2.5, life: [0.5, 1], size: [0.1, 0.26], gravity: 3,
        });
      }),
      // checkpoint — small gold star burst at the flag
      on('checkpoint', ({ x, y }) => {
        remember(x, y);
        burst('add', {
          x, y: y + 1.5, count: 12, color: [GOLD, MINT],
          speed: [0.8, 2.4], up: 1.8, life: [0.4, 0.8], size: [0.09, 0.2], gravity: 2,
        });
      }),
      on('spring', ({ x, y }) => {
        remember(x, y);
        burst('solid', {
          x, y, count: 4, color: [MINT, CREAM],
          speed: [1, 2], up: 3, life: [0.25, 0.4], size: [0.1, 0.18],
        });
      }),
      on('kickShell', () => {
        const p = playerPos();
        burst('solid', {
          x: p.x, y: p.y, count: 4, color: CREAM,
          speed: [1, 2.5], up: 0.6, life: [0.2, 0.35], size: [0.12, 0.2], drag: 0.9,
        });
      }),
      // flagpole confetti — rainbow paper rain
      on('flagGrab', () => {
        const p = playerPos();
        burst('solid', {
          x: p.x, y: p.y + 3, count: 40, color: CONFETTI, spread: 3,
          speed: [0.5, 2.5], up: 2, life: [1.2, 2.2], size: [0.09, 0.18], gravity: 5, drag: 0.985,
        });
      }),
      on('levelComplete', () => {
        trailUntilRef.current = 0;
        const p = playerPos();
        burst('solid', {
          x: p.x, y: p.y + 2, count: 36, color: CONFETTI, spread: 4,
          speed: [0.5, 2], up: 1.5, life: [1.2, 2.4], size: [0.09, 0.18], gravity: 4.5, drag: 0.985,
        });
      }),
      // boss explosion — big hot blast + smoke
      on('bossDown', () => {
        const p = playerPos();
        burst('add', {
          x: p.x + 2, y: p.y + 1, count: 50, color: [LAVA, GOLD, VIOLET, CREAM], spread: 1.2,
          speed: [2, 7], up: 2, life: [0.5, 1.2], size: [0.16, 0.4], gravity: 4, drag: 0.96,
        });
        burst('solid', {
          x: p.x + 2, y: p.y + 1, count: 16, color: [BRICK_DARK, VIOLET], spread: 1,
          speed: [1, 4], up: 3, life: [0.6, 1.1], size: [0.14, 0.3], gravity: 12,
        });
      }),
      on('pipeEnter', ({ x, y }) => {
        remember(x, y);
        burst('add', {
          x: x + 1, y: y + 0.5, count: 8, color: [MINT, SKY],
          speed: [0.5, 1.5], up: 0.5, life: [0.3, 0.6], size: [0.08, 0.16],
        });
      }),
      on('shoot', () => {
        const p = playerPos();
        burst('add', {
          x: p.x, y: p.y + 0.3, count: 4, color: [LAVA, GOLD],
          speed: [0.5, 1.5], up: 0.3, life: [0.15, 0.3], size: [0.07, 0.14],
        });
      }),
    ];
    return () => unsubs.forEach((u) => u());
  }, []);

  useFrame((_state, dt) => {
    clockRef.current += dt;
    const step = Math.min(dt, 0.05);

    // (re)acquire the player group occasionally — it's mounted by the engine
    if (!playerRef.current || !playerRef.current.parent) {
      playerRef.current = findPlayerGroup(scene);
    }
    if (playerRef.current) {
      lastPosRef.current = {
        x: playerRef.current.position.x,
        y: playerRef.current.position.y,
      };
    } else {
      // fallback: trail near the camera target
      lastPosRef.current = { x: camera.position.x, y: camera.position.y };
    }

    const pools = poolsRef.current;
    if (!pools && addMeshRef.current && solidMeshRef.current) {
      poolsRef.current = {
        add: { mesh: addMeshRef.current, particles: makeParticles(ADD_MAX), cursor: 0 },
        solid: { mesh: solidMeshRef.current, particles: makeParticles(SOLID_MAX), cursor: 0 },
      };
    }
    if (!poolsRef.current) return;
    const p = poolsRef.current;

    // invincibility rainbow trail on Pip
    if (clockRef.current < trailUntilRef.current) {
      trailHueRef.current = (trailHueRef.current + step * 2.4) % 1;
      const pos = playerPos();
      tmpColor.setHSL(trailHueRef.current, 0.85, 0.6);
      spawnInto(p.add, {
        x: pos.x + (Math.random() - 0.5) * 0.5,
        y: pos.y + (Math.random() - 0.5) * 0.7,
        count: 2,
        color: tmpColor.clone(),
        speed: [0.1, 0.6],
        life: [0.35, 0.6],
        size: [0.12, 0.24],
        drag: 0.94,
      });
    }

    updatePool(p.add, step);
    updatePool(p.solid, step);
  });

  return (
    <>
      <instancedMesh
        ref={addMeshRef}
        args={[addGeo, addMat, ADD_MAX]}
        frustumCulled={false}
        renderOrder={10}
      />
      <instancedMesh
        ref={solidMeshRef}
        args={[solidGeo, solidMat, SOLID_MAX]}
        frustumCulled={false}
        renderOrder={9}
      />
    </>
  );
}
