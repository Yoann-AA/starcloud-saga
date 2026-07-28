// Shared helpers for POD-ENTITIES: grid adapter, materials, star shape,
// theme tinting, player-overlap tests, and the live-enemy registry used by
// shells / ember shots to find victims. Engine files are imported READ-ONLY.
import * as THREE from 'three';
import { THEMES } from '../engine/constants';
import type { ThemeKey } from '../engine/constants';
import { makeBody, rectsOverlap } from '../engine/physics';
import type { Body, SolidGrid } from '../engine/physics';
import type { GameContext, Rect } from '../engine/types';

/** Adapt the ctx solid query into the engine SolidGrid shape (moveAndCollide only reads isSolid). */
export function gridOf(ctx: GameContext): SolidGrid {
  return {
    width: ctx.level.width,
    height: ctx.level.height,
    isSolid: ctx.isSolid,
    tileAt: () => '.',
  };
}

export { makeBody, rectsOverlap };
export type { Body };

export function playerRect(ctx: GameContext): Rect {
  const p = ctx.player;
  return { x: p.x, y: p.y, w: p.w, h: p.h };
}

/** True when the player is falling onto the top half of the given rect. */
export function isStomp(ctx: GameContext, e: Rect): boolean {
  const p = ctx.player;
  return p.vy < -0.5 && p.y >= e.y + e.h * 0.45;
}

// ---------------------------------------------------------------------------
// materials / meshes
// ---------------------------------------------------------------------------

export function flatMat(
  color: string | THREE.Color,
  opts: { emissive?: string; emissiveIntensity?: number; roughness?: number } = {},
): THREE.MeshStandardMaterial {
  return new THREE.MeshStandardMaterial({
    color,
    roughness: opts.roughness ?? 0.65,
    flatShading: true,
    emissive: opts.emissive ?? '#000000',
    emissiveIntensity: opts.emissiveIntensity ?? 0,
  });
}

/** Rounded five-point star outline (storybook motif). */
export function makeStarShape(r: number): THREE.Shape {
  const shape = new THREE.Shape();
  for (let i = 0; i < 10; i++) {
    const angle = (i * Math.PI) / 5 - Math.PI / 2;
    const radius = i % 2 === 0 ? r : r * 0.46;
    const x = Math.cos(angle) * radius;
    const y = Math.sin(angle) * radius;
    if (i === 0) shape.moveTo(x, y);
    else shape.lineTo(x, y);
  }
  shape.closePath();
  return shape;
}

export function makeStarGeo(r: number, depth = 0.14): THREE.ExtrudeGeometry {
  const geo = new THREE.ExtrudeGeometry(makeStarShape(r), {
    depth,
    bevelEnabled: true,
    bevelThickness: 0.03,
    bevelSize: 0.03,
    bevelSegments: 1,
  });
  geo.center();
  return geo;
}

// ---------------------------------------------------------------------------
// per-world reskin (design.md §3 palettes live in engine/constants THEMES)
// ---------------------------------------------------------------------------

/** Blend an archetype base color toward the world primary for the reskin. */
export function worldTint(theme: ThemeKey, base: string, amount = 0.35): THREE.Color {
  return new THREE.Color(base).lerp(new THREE.Color(THEMES[theme].ground), amount);
}

/** World secondary accent (dirt/secondary swatch). */
export function worldAccent(theme: ThemeKey): string {
  return THEMES[theme].dirt;
}

// ---------------------------------------------------------------------------
// live-enemy registry: sliding shells and ember shots find victims here
// ---------------------------------------------------------------------------

export interface EnemyHandle {
  readonly isBoss: boolean;
  alive(): boolean;
  aabb(): Rect;
  /** hit by an ember shot */
  hitByShot(ctx: GameContext): void;
  /** hit by a sliding shell */
  hitByShell(ctx: GameContext): void;
}

const liveEnemies = new Set<EnemyHandle>();

export function addLiveEnemy(e: EnemyHandle): void {
  liveEnemies.add(e);
}

export function forEachLiveEnemy(cb: (e: EnemyHandle) => void): void {
  const stale: EnemyHandle[] = [];
  for (const e of liveEnemies) {
    if (!e.alive()) {
      stale.push(e);
      continue;
    }
    cb(e);
  }
  for (const e of stale) liveEnemies.delete(e);
}
