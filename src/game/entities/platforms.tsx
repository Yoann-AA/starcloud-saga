// PLATFORMS — moving / falling solid platforms.
// NOTE (engine gap): player physics collides only with the tile grid and
// ctx.player is an immutable snapshot, so platforms cannot physically carry
// the player yet. They expose `solid = true` + aabb() for future engine
// support, move on their tracks, and platform_fall detects "stood on" via
// position-matching against the player snapshot.
import * as THREE from 'three';
import type { ThemeKey } from '../engine/constants';
import type { EntityInstance, EntitySpawn, GameContext, Rect } from '../engine/types';
import { tickPool } from './pool';
import { flatMat, worldTint } from './shared';

const PLAT_W = 2.4;
const PLAT_H = 0.4;

function numProp(e: EntitySpawn, key: string, fallback: number): number {
  const v = e.props?.[key];
  return typeof v === 'number' && Number.isFinite(v) ? v : fallback;
}

function buildPlatformMesh(theme: ThemeKey, falling: boolean): THREE.Group {
  const g = new THREE.Group();
  const topMat = flatMat(worldTint(theme, '#F2E4CE', 0.35));
  const baseMat = flatMat(worldTint(theme, '#8A4A2B', 0.3));
  const top = new THREE.Mesh(new THREE.BoxGeometry(PLAT_W, 0.16, 1.2), topMat);
  top.position.y = PLAT_H - 0.08;
  g.add(top);
  const base = new THREE.Mesh(new THREE.BoxGeometry(PLAT_W - 0.3, PLAT_H - 0.12, 1), baseMat);
  base.position.y = (PLAT_H - 0.12) / 2;
  g.add(base);
  for (const dx of [-(PLAT_W / 2 - 0.25), PLAT_W / 2 - 0.25]) {
    const rivet = new THREE.Mesh(new THREE.SphereGeometry(0.06, 6, 5), flatMat('#1B1233'));
    rivet.position.set(dx, PLAT_H - 0.05, 0.45);
    g.add(rivet);
  }
  if (falling) {
    // cracked warning stripe on fall platforms
    const stripe = new THREE.Mesh(
      new THREE.BoxGeometry(PLAT_W - 0.6, 0.05, 0.1),
      flatMat('#FF6B35', { emissive: '#FF3B12', emissiveIntensity: 0.4 }),
    );
    stripe.position.set(0, PLAT_H - 0.04, 0.61);
    g.add(stripe);
  }
  return g;
}

/** platform_h / platform_v — constant-speed ping-pong along one axis. */
class MovingPlatform implements EntityInstance {
  readonly object3D: THREE.Object3D;
  readonly solid = true;
  private axis: 'x' | 'y';
  private origin: number;
  private range: number;
  private speed: number;
  private x: number;
  private y: number;

  constructor(e: EntitySpawn, ctx: GameContext, axis: 'x' | 'y') {
    this.axis = axis;
    this.range = Math.max(0.5, numProp(e, 'range', 3));
    this.speed = Math.max(0.2, numProp(e, 'speed', 1.2));
    this.x = e.x;
    this.y = e.y;
    this.origin = axis === 'x' ? e.x : e.y;
    this.object3D = buildPlatformMesh(ctx.level.theme, false);
    this.object3D.position.set(this.x + PLAT_W / 2, this.y, 0);
  }

  aabb(): Rect {
    return { x: this.x, y: this.y, w: PLAT_W, h: PLAT_H };
  }

  update(dt: number, ctx: GameContext): void {
    tickPool(this.object3D, dt, ctx);
    // triangular ping-pong between origin and origin+range at constant speed
    const period = (2 * this.range) / this.speed;
    const t = ctx.time % period;
    const offset = t < period / 2 ? t * this.speed : 2 * this.range - t * this.speed;
    if (this.axis === 'x') this.x = this.origin + offset;
    else this.y = this.origin + offset;
    this.object3D.position.set(this.x + PLAT_W / 2, this.y, 0);
  }
}

type FallState = 'idle' | 'shaking' | 'falling' | 'gone';

/** platform_fall — shakes when stood on, then drops; respawns later. */
class FallingPlatform implements EntityInstance {
  readonly object3D: THREE.Object3D;
  readonly solid = true;
  private ox: number;
  private oy: number;
  private x: number;
  private y: number;
  private vy = 0;
  private state: FallState = 'idle';
  private timer = 0;
  private t = 0;

  constructor(e: EntitySpawn, ctx: GameContext) {
    this.ox = e.x;
    this.oy = e.y;
    this.x = e.x;
    this.y = e.y;
    this.object3D = buildPlatformMesh(ctx.level.theme, true);
    this.object3D.position.set(this.x + PLAT_W / 2, this.y, 0);
  }

  aabb(): Rect {
    return { x: this.x, y: this.y, w: PLAT_W, h: PLAT_H };
  }

  update(dt: number, ctx: GameContext): void {
    tickPool(this.object3D, dt, ctx);
    this.t += dt;
    const p = ctx.player;

    if (this.state === 'idle') {
      // stood on? player feet resting on the top surface with x overlap
      const top = this.y + PLAT_H;
      const xOverlap = p.x + p.w > this.x + 0.1 && p.x < this.x + PLAT_W - 0.1;
      const feetOn = Math.abs(p.y - top) < 0.14 && p.vy <= 0.05;
      if (!p.dead && xOverlap && feetOn) {
        this.state = 'shaking';
        this.timer = 0;
      }
    } else if (this.state === 'shaking') {
      this.timer += dt;
      if (this.timer > 0.55) {
        this.state = 'falling';
        this.vy = 0;
      }
    } else if (this.state === 'falling') {
      this.vy -= 30 * dt;
      this.y += this.vy * dt;
      if (this.y < this.oy - 14) {
        this.state = 'gone';
        this.timer = 0;
        this.object3D.visible = false;
      }
    } else {
      // gone — respawn at the anchor after a breather
      this.timer += dt;
      if (this.timer > 6) {
        this.state = 'idle';
        this.x = this.ox;
        this.y = this.oy;
        this.vy = 0;
        this.object3D.visible = true;
      }
    }

    const shake = this.state === 'shaking' ? Math.sin(this.t * 55) * 0.05 : 0;
    this.object3D.position.set(this.x + PLAT_W / 2 + shake, this.y, 0);
  }
}

export function registerPlatforms(
  register: (type: string, def: { create(e: EntitySpawn, ctx: GameContext): EntityInstance }) => void,
): void {
  register('platform_h', { create: (e, ctx) => new MovingPlatform(e, ctx, 'x') });
  register('platform_v', { create: (e, ctx) => new MovingPlatform(e, ctx, 'y') });
  register('platform_fall', { create: (e, ctx) => new FallingPlatform(e, ctx) });
}
