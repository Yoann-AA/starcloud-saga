// ITEMS — physical power-ups spawned on `powerupSpawn` (emerge-and-slide,
// classic) and the Ember Shot projectile spawned on `shoot`.
// Dynamic spawns go through the entity pool (engine has no runtime spawn API).
import * as THREE from 'three';
import { GRAVITY, KILL_Y } from '../engine/constants';
import { moveAndCollide } from '../engine/physics';
import type { EntityInstance, EntitySpawn, GameContext, Rect } from '../engine/types';
import { poolCount, poolSpawn } from './pool';
import type { PoolEntity } from './pool';
import {
  flatMat,
  forEachLiveEnemy,
  gridOf,
  makeBody,
  makeStarGeo,
  playerRect,
  rectsOverlap,
} from './shared';
import type { Body } from './shared';

export type PowerupKind = 'berry' | 'ember' | 'comet' | 'oneUp';

const EMERGE_TIME = 0.55;
const MAX_EMBER_SHOTS = 2;

// ---------------------------------------------------------------------------
// meshes
// ---------------------------------------------------------------------------

function buildPowerupMesh(kind: PowerupKind): THREE.Group {
  const g = new THREE.Group();
  if (kind === 'berry') {
    // Star-Berry: pink heart-berry with a gold star and a leaf
    const berry = new THREE.Mesh(
      new THREE.SphereGeometry(0.3, 12, 10),
      flatMat('#FF5D7E', { emissive: '#FF5D7E', emissiveIntensity: 0.15 }),
    );
    berry.position.y = 0.32;
    berry.scale.set(1, 0.95, 0.9);
    g.add(berry);
    const star = new THREE.Mesh(
      makeStarGeo(0.13, 0.05),
      flatMat('#FFC93C', { emissive: '#E8A50F', emissiveIntensity: 0.4 }),
    );
    star.position.set(0, 0.32, 0.28);
    g.add(star);
    const leaf = new THREE.Mesh(new THREE.ConeGeometry(0.09, 0.2, 5), flatMat('#59D99C'));
    leaf.position.set(0.05, 0.64, 0);
    leaf.rotation.z = -0.5;
    g.add(leaf);
  } else if (kind === 'ember') {
    // Ember Flower: flame-petal flower on a stem
    const stem = new THREE.Mesh(new THREE.CylinderGeometry(0.04, 0.05, 0.34, 6), flatMat('#2FA36B'));
    stem.position.y = 0.17;
    g.add(stem);
    const core = new THREE.Mesh(
      new THREE.SphereGeometry(0.13, 8, 6),
      flatMat('#FFC93C', { emissive: '#E8A50F', emissiveIntensity: 0.5 }),
    );
    core.position.y = 0.44;
    g.add(core);
    for (let i = 0; i < 5; i++) {
      const a = (i / 5) * Math.PI * 2;
      const petal = new THREE.Mesh(
        new THREE.ConeGeometry(0.09, 0.24, 5),
        flatMat('#FF6B35', { emissive: '#FF3B12', emissiveIntensity: 0.35 }),
      );
      petal.position.set(Math.cos(a) * 0.2, 0.44 + Math.sin(a) * 0.2, 0);
      petal.rotation.z = a - Math.PI / 2;
      g.add(petal);
    }
  } else if (kind === 'comet') {
    // Comet Star: glowing gold star with a trail fin
    const star = new THREE.Mesh(
      makeStarGeo(0.3, 0.12),
      flatMat('#FFC93C', { emissive: '#9B7BFF', emissiveIntensity: 0.55 }),
    );
    star.position.y = 0.34;
    star.name = 'spin';
    g.add(star);
    for (let i = 0; i < 3; i++) {
      const fin = new THREE.Mesh(
        new THREE.ConeGeometry(0.05, 0.16, 4),
        flatMat(['#FF5D7E', '#4FC4FF', '#59D99C'][i], { emissiveIntensity: 0.3, emissive: ['#FF5D7E', '#4FC4FF', '#59D99C'][i] }),
      );
      fin.position.set(-0.3 - i * 0.09, 0.2 + i * 0.12, 0);
      fin.rotation.z = Math.PI / 2 + 0.4;
      g.add(fin);
    }
  } else {
    // 1-up Heart: berry-pink heart
    const mat = flatMat('#FF5D7E', { emissive: '#FF5D7E', emissiveIntensity: 0.3 });
    const l = new THREE.Mesh(new THREE.SphereGeometry(0.17, 10, 8), mat);
    l.position.set(-0.1, 0.44, 0);
    g.add(l);
    const r = new THREE.Mesh(new THREE.SphereGeometry(0.17, 10, 8), mat);
    r.position.set(0.1, 0.44, 0);
    g.add(r);
    const tip = new THREE.Mesh(new THREE.ConeGeometry(0.26, 0.32, 4), mat);
    tip.position.set(0, 0.22, 0);
    tip.rotation.z = Math.PI;
    tip.rotation.y = Math.PI / 4;
    tip.scale.z = 0.6;
    g.add(tip);
    const shine = new THREE.Mesh(new THREE.SphereGeometry(0.05, 6, 5), flatMat('#FFF6E8', { emissive: '#FFF6E8', emissiveIntensity: 0.6 }));
    shine.position.set(-0.13, 0.5, 0.13);
    g.add(shine);
  }
  return g;
}

// ---------------------------------------------------------------------------
// PowerupItem — emerges from the block, then walks/bounces; collect on touch
// ---------------------------------------------------------------------------

export class PowerupItem implements PoolEntity {
  readonly object3D: THREE.Object3D;
  private kind: PowerupKind;
  private body: Body;
  private emerge: number = EMERGE_TIME;
  private startY: number;
  private dir: 1 | -1 = 1;
  private t = 0;
  private gone = false;

  constructor(kind: PowerupKind, x: number, y: number) {
    this.kind = kind;
    this.body = makeBody(x - 0.3, y - 0.9, 0.6, 0.6);
    this.startY = y - 0.9;
    this.object3D = buildPowerupMesh(kind);
    this.object3D.position.set(x - 0.3 + 0.3, this.startY, 0);
  }

  done(): boolean {
    return this.gone;
  }

  aabb(): Rect {
    return { x: this.body.x, y: this.body.y, w: this.body.w, h: this.body.h };
  }

  update(dt: number, ctx: GameContext): void {
    if (this.gone) return;
    this.t += dt;

    // --- emerge phase: rise out of the block, no collision, no collect ---
    if (this.emerge > 0) {
      this.emerge -= dt;
      const k = 1 - Math.max(0, this.emerge) / EMERGE_TIME;
      this.body.y = this.startY + k * 0.95;
      this.syncMesh();
      return;
    }

    // --- walk-and-fall physics per kind ---
    if (this.kind === 'ember') {
      this.body.vx = 0; // flowers stay put
    } else {
      const speed = this.kind === 'comet' ? 2.6 : 2.1;
      this.body.vx = this.dir * speed;
    }
    this.body.vy = Math.max(this.body.vy - GRAVITY * dt, -16);
    const wasAirborne = !this.body.onGround;
    moveAndCollide(this.body, gridOf(ctx), dt);
    if (this.body.vx === 0 && this.kind !== 'ember') this.dir = this.dir === 1 ? -1 : 1;
    // comet star bounces
    if (this.kind === 'comet' && this.body.onGround && wasAirborne) {
      this.body.vy = 7.5;
      this.body.onGround = false;
    }

    this.syncMesh();

    // --- collect on player overlap ---
    const p = ctx.player;
    if (!p.dead && p.anim !== 'win' && rectsOverlap(this.aabb(), playerRect(ctx))) {
      ctx.emit('powerupCollect', { kind: this.kind });
      if (this.kind === 'oneUp') ctx.emit('oneUp');
      else ctx.emit('score', { n: 1000 });
      this.gone = true;
      this.object3D.removeFromParent();
      return;
    }

    if (this.body.y < KILL_Y - 4 || this.t > 30) {
      this.gone = true;
      this.object3D.removeFromParent();
    }
  }

  private syncMesh(): void {
    this.object3D.position.set(this.body.x + this.body.w / 2, this.body.y, 0);
    const spin = this.object3D.getObjectByName('spin');
    if (spin) spin.rotation.y += 0.08;
    const bob = this.kind === 'ember' ? Math.sin(this.t * 3) * 0.05 : 0;
    this.object3D.position.y += bob;
  }
}

// ---------------------------------------------------------------------------
// EmberShot — small fireball with gravity bounce; defeats enemies on hit,
// expires on walls / after a short life
// ---------------------------------------------------------------------------

const EMBER_SHOT_GRAVITY = 30;

export class EmberShot implements PoolEntity {
  readonly object3D: THREE.Object3D;
  private body: Body;
  private life = 3;
  private t = 0;
  private gone = false;
  private flame: THREE.Mesh;

  constructor(x: number, y: number, dir: 1 | -1) {
    this.body = makeBody(x, y, 0.34, 0.34);
    this.body.vx = 8.5 * dir;
    this.body.vy = 2.5;
    this.object3D = new THREE.Group();
    this.flame = new THREE.Mesh(
      new THREE.SphereGeometry(0.19, 8, 6),
      flatMat('#FF6B35', { emissive: '#FF3B12', emissiveIntensity: 0.9 }),
    );
    this.flame.position.y = 0.17;
    this.object3D.add(this.flame);
    const coreM = new THREE.Mesh(
      new THREE.SphereGeometry(0.1, 6, 5),
      flatMat('#FFC93C', { emissive: '#E8A50F', emissiveIntensity: 1 }),
    );
    coreM.position.set(0.05 * dir, 0.17, 0.08);
    this.object3D.add(coreM);
  }

  done(): boolean {
    return this.gone;
  }

  aabb(): Rect {
    return { x: this.body.x, y: this.body.y, w: this.body.w, h: this.body.h };
  }

  update(dt: number, ctx: GameContext): void {
    if (this.gone) return;
    this.t += dt;
    this.life -= dt;

    this.body.vy = Math.max(this.body.vy - EMBER_SHOT_GRAVITY * dt, -14);
    const wasAirborne = !this.body.onGround;
    moveAndCollide(this.body, gridOf(ctx), dt);

    // bounce on ground
    if (this.body.onGround && wasAirborne) {
      this.body.vy = 6.5;
      this.body.onGround = false;
    }
    // expire on walls or old age
    if (this.body.vx === 0 || this.life <= 0 || this.body.y < KILL_Y - 2) {
      this.gone = true;
      this.object3D.removeFromParent();
      return;
    }

    this.object3D.position.set(this.body.x + this.body.w / 2, this.body.y, 0);
    this.flame.scale.setScalar(1 + Math.sin(this.t * 30) * 0.15);

    // defeat enemies on hit
    const me = this.aabb();
    let hit = false;
    forEachLiveEnemy((enemy) => {
      if (hit || !rectsOverlap(me, enemy.aabb())) return;
      enemy.hitByShot(ctx);
      hit = true;
    });
    if (hit) {
      this.gone = true;
      this.object3D.removeFromParent();
    }
  }
}

// ---------------------------------------------------------------------------
// event wiring (called once from registerAllEntities)
// ---------------------------------------------------------------------------

function normalizeKind(kind: string): PowerupKind {
  if (kind === 'ember' || kind === 'comet' || kind === 'oneUp') return kind;
  return 'berry';
}

/** Queue a power-up spawn from the engine's powerupSpawn event payload. */
export function queuePowerup(kind: string, x: number, y: number): void {
  poolSpawn(() => new PowerupItem(normalizeKind(kind), x, y));
}

/** Queue an ember shot from the `shoot` event (reads the player snapshot). */
export function queueEmberShot(ctx: GameContext | null): void {
  if (!ctx) return;
  const p = ctx.player;
  if (p.dead || p.power !== 'ember') return;
  if (poolCount((e) => e instanceof EmberShot) >= MAX_EMBER_SHOTS) return;
  const dir = p.facing;
  poolSpawn(
    () => new EmberShot(p.x + p.w / 2 + dir * 0.5 - 0.17, p.y + p.h * 0.55, dir),
  );
}

/** Level-JSON placement support: `powerup` entity with props.kind. */
export function createPowerupEntity(e: EntitySpawn, _ctx: GameContext): EntityInstance {
  const kind = normalizeKind(typeof e.props?.kind === 'string' ? e.props.kind : 'berry');
  return new PowerupItem(kind, e.x, e.y);
}

/** Level-JSON placement support: `ember_shot` entity (mainly for tests). */
export function createEmberShotEntity(e: EntitySpawn, _ctx: GameContext): EntityInstance {
  return new EmberShot(e.x, e.y, 1);
}
