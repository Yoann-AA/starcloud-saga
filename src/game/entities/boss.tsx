// BOSS — castle guardian. Paces an arena, shoots slow arcing blobs.
// Immune to stomps (stomping hurts the player). Defeated by 3 ember hits
// (emits `bossDown` itself) or collapses when a `bossDown` event arrives
// from elsewhere (engine axe-tile path).
import * as THREE from 'three';
import { GRAVITY, KILL_Y } from '../engine/constants';
import { moveAndCollide } from '../engine/physics';
import type { EntitySpawn, GameContext } from '../engine/types';
import { EnemyBase } from './enemies';
import { flatMat, gridOf, playerRect, rectsOverlap, worldTint } from './shared';
import type { Body } from './shared';
import { makeBody } from './shared';

const HITS_TO_DOWN = 3;
const MAX_BLOBS = 3;

// ---------------------------------------------------------------------------
// BossBlob — slow arcing projectile
// ---------------------------------------------------------------------------

class BossBlob {
  readonly object3D: THREE.Object3D = new THREE.Group();
  private body: Body;
  private life = 5;
  private touchCd = 0;
  dead = false;

  constructor(x: number, y: number, vx: number, vy: number, themeTint: THREE.Color) {
    this.body = makeBody(x, y, 0.5, 0.5);
    this.body.vx = vx;
    this.body.vy = vy;
    const blob = new THREE.Mesh(
      new THREE.SphereGeometry(0.26, 9, 7),
      flatMat(themeTint, { emissive: '#5B3FD4', emissiveIntensity: 0.6 }),
    );
    blob.position.y = 0.25;
    this.object3D.add(blob);
    this.object3D.position.set(x + 0.25, y, 0);
  }

  update(dt: number, ctx: GameContext): void {
    if (this.dead) return;
    this.life -= dt;
    this.touchCd = Math.max(0, this.touchCd - dt);
    this.body.vy = Math.max(this.body.vy - GRAVITY * 0.8 * dt, -14);
    moveAndCollide(this.body, gridOf(ctx), dt);
    // splat on ground / wall / timeout
    if (this.body.onGround || this.body.vx === 0 || this.life <= 0 || this.body.y < KILL_Y) {
      this.dead = true;
      this.object3D.removeFromParent();
      return;
    }
    this.object3D.position.set(this.body.x + this.body.w / 2, this.body.y, 0);
    this.object3D.rotation.z += 3 * dt;
    const p = ctx.player;
    if (!p.dead && !p.invincible && p.anim !== 'win' && this.touchCd <= 0) {
      if (rectsOverlap({ x: this.body.x, y: this.body.y, w: this.body.w, h: this.body.h }, playerRect(ctx))) {
        this.touchCd = 0.9;
        ctx.emit('damage');
      }
    }
  }
}

// ---------------------------------------------------------------------------
// Boss — big guardian
// ---------------------------------------------------------------------------

class Boss extends EnemyBase {
  readonly isBoss = true;
  private ox: number;
  private arena: number;
  private speed = 1.7;
  private hits = 0;
  private shotCd = 2.0;
  private flash = 0;
  private blobs: BossBlob[] = [];
  private bodyMat: THREE.MeshStandardMaterial;
  private armL: THREE.Mesh;
  private armR: THREE.Mesh;

  constructor(e: EntitySpawn, ctx: GameContext) {
    super(e, ctx, 2.0, 2.4);
    this.ox = e.x;
    const arenaProp = e.props?.arena;
    this.arena = typeof arenaProp === 'number' && arenaProp > 1 ? arenaProp : 4;

    const g = this.object3D;
    this.bodyMat = flatMat(worldTint(this.theme, '#5B3FD4', 0.3));
    const bellyMat = flatMat(worldTint(this.theme, '#F2E4CE', 0.2));
    const hornMat = flatMat('#C0C8D8', { roughness: 0.35 });
    const dark = flatMat('#1B1233', { roughness: 0.3 });

    const bodyMesh = new THREE.Mesh(new THREE.SphereGeometry(1.15, 14, 11), this.bodyMat);
    bodyMesh.position.y = 1.25;
    bodyMesh.scale.set(1, 1.05, 0.85);
    g.add(bodyMesh);
    const belly = new THREE.Mesh(new THREE.SphereGeometry(0.8, 12, 9), bellyMat);
    belly.position.set(0, 1.0, 0.42);
    belly.scale.set(0.85, 0.95, 0.55);
    g.add(belly);
    for (const dx of [-0.55, 0.55]) {
      const horn = new THREE.Mesh(new THREE.ConeGeometry(0.2, 0.6, 6), hornMat);
      horn.position.set(dx, 2.45, 0);
      horn.rotation.z = dx > 0 ? -0.35 : 0.35;
      g.add(horn);
    }
    // angry eyes + brows
    for (const dx of [-0.32, 0.32]) {
      const eye = new THREE.Mesh(new THREE.SphereGeometry(0.16, 8, 6), flatMat('#FFF6E8'));
      eye.position.set(dx, 1.62, 0.92);
      g.add(eye);
      const pupil = new THREE.Mesh(new THREE.SphereGeometry(0.07, 6, 5), dark);
      pupil.position.set(dx, 1.6, 1.05);
      g.add(pupil);
      const brow = new THREE.Mesh(new THREE.BoxGeometry(0.36, 0.08, 0.06), dark);
      brow.position.set(dx, 1.84, 0.95);
      brow.rotation.z = dx > 0 ? 0.35 : -0.35;
      g.add(brow);
    }
    // crystal crest (world accent)
    const crest = new THREE.Mesh(
      new THREE.OctahedronGeometry(0.28, 0),
      flatMat(worldTint(this.theme, '#9B7BFF', 0.3), { emissive: '#9B7BFF', emissiveIntensity: 0.5 }),
    );
    crest.position.y = 2.75;
    g.add(crest);
    // arms + feet
    this.armL = new THREE.Mesh(new THREE.SphereGeometry(0.32, 9, 7), this.bodyMat);
    this.armL.position.set(-1.2, 1.1, 0);
    g.add(this.armL);
    this.armR = new THREE.Mesh(new THREE.SphereGeometry(0.32, 9, 7), this.bodyMat);
    this.armR.position.set(1.2, 1.1, 0);
    g.add(this.armR);
    for (const dx of [-0.5, 0.5]) {
      const foot = new THREE.Mesh(new THREE.BoxGeometry(0.55, 0.3, 0.7), dark);
      foot.position.set(dx, 0.15, 0.1);
      g.add(foot);
    }
  }

  // --- immune to stomp: ANY contact hurts the player (unless comet) ---
  protected checkPlayer(ctx: GameContext): void {
    const p = ctx.player;
    if (p.dead || p.anim === 'win' || p.anim === 'pipe' || p.invincible) return;
    if (rectsOverlap(this.aabb(), playerRect(ctx))) this.hurtPlayer(ctx);
  }

  hitByShot(ctx: GameContext): void {
    if (!this.alive() || this.flash > 0.2) return;
    this.hits += 1;
    this.flash = 0.45;
    if (this.hits >= HITS_TO_DOWN) {
      ctx.emit('bossDown');
      ctx.emit('score', { n: 5000 });
      this.collapse();
    }
  }

  hitByShell(ctx: GameContext): void {
    this.hitByShot(ctx); // a sliding shell counts as one hit
  }

  /** collapse triggered by an external bossDown (axe tile path) */
  forceCollapse(): void {
    if (!this.alive()) return;
    this.collapse();
  }

  private collapse(): void {
    this.startDeath('squish'); // stepDeath overridden below for the fall-over anim
    for (const b of this.blobs) {
      b.dead = true;
      b.object3D.removeFromParent();
    }
    this.blobs = [];
  }

  protected stepDeath(dt: number): void {
    // topple backward, sink, shrink, then despawn
    this.deathT += dt;
    this.object3D.rotation.z = Math.min(this.object3D.rotation.z + dt * 1.6, 1.35);
    this.object3D.position.y -= dt * 0.8;
    const s = Math.max(0.05, this.object3D.scale.x - dt * 0.45);
    this.object3D.scale.setScalar(s);
    if (this.deathT > 1.8) this.remove();
  }

  /** boss mesh is symmetric; skip the walking flip rotation */
  protected syncMesh(): void {
    this.object3D.position.set(this.body.x + this.body.w / 2, this.body.y, 0);
  }

  protected think(dt: number, ctx: GameContext): void {
    this.flash = Math.max(0, this.flash - dt);
    this.bodyMat.emissive.set(this.flash > 0 ? '#FF4757' : '#000000');
    this.bodyMat.emissiveIntensity = this.flash > 0 ? 0.9 : 0;

    // pace the arena, turn at walls and arena bounds
    this.body.vx = this.dir * this.speed;
    this.stepPhysics(dt, ctx);
    if (this.body.vx === 0) this.dir = this.dir === 1 ? -1 : 1;
    if (this.body.x < this.ox - this.arena) this.dir = 1;
    if (this.body.x > this.ox + this.arena) this.dir = -1;

    // face the player when close
    const dx = ctx.player.x - this.body.x;
    if (Math.abs(dx) < 10) this.object3D.rotation.y = dx >= 0 ? Math.PI / 2 : -Math.PI / 2;

    // arms pump while pacing
    const pump = Math.sin(this.t * 6) * 0.2;
    this.armL.position.y = 1.1 + pump;
    this.armR.position.y = 1.1 - pump;

    // shoot slow arcing blobs toward the player
    this.shotCd -= dt;
    if (this.shotCd <= 0 && Math.abs(dx) < 14 && !ctx.player.dead) {
      this.shotCd = 2.4;
      this.blobs = this.blobs.filter((b) => !b.dead);
      if (this.blobs.length < MAX_BLOBS) {
        const dir = dx >= 0 ? 1 : -1;
        const blob = new BossBlob(
          this.body.x + this.body.w / 2 + dir * 1.2,
          this.body.y + 1.6,
          dir * 3.8,
          8.5,
          worldTint(this.theme, '#8A4A2B', 0.3),
        );
        this.blobs.push(blob);
        this.object3D.parent?.add(blob.object3D);
        // NOTE: intentionally does NOT emit 'shoot' — that event is reserved
        // for the player's ember shots (my own listener would spawn one).
      }
    }

    // update owned blobs
    for (const b of this.blobs) b.update(dt, ctx);
    this.blobs = this.blobs.filter((b) => !b.dead);
  }

  protected remove(): void {
    for (const b of this.blobs) b.object3D.removeFromParent();
    this.blobs = [];
    if (currentBoss === this) currentBoss = null;
    super.remove();
  }
}

// ---------------------------------------------------------------------------
// module wiring
// ---------------------------------------------------------------------------

let currentBoss: Boss | null = null;

/** Called on a `bossDown` event from outside (engine axe path). */
export function collapseCurrentBoss(): void {
  currentBoss?.forceCollapse();
}

export function createBoss(e: EntitySpawn, ctx: GameContext): Boss {
  const boss = new Boss(e, ctx);
  currentBoss = boss;
  return boss;
}
