// ENEMIES — six original archetypes (design.md §9 bestiary), low-poly
// storybook meshes from Three.js primitives, per-world tint reskins.
//
// Interaction model (engine never calls onStomp/onTouch — see report):
// every enemy self-detects player overlap from the ctx.player snapshot.
//   - player falling onto the top  -> stomp: squish anim, despawn, emit stomp
//   - side contact                 -> emit damage (per-enemy cooldown)
//   - player comet-invincible      -> enemy is defeated on contact
import * as THREE from 'three';
import { GRAVITY, KILL_Y } from '../engine/constants';
import type { ThemeKey } from '../engine/constants';
import { moveAndCollide } from '../engine/physics';
import type { EntityInstance, EntitySpawn, GameContext, Rect } from '../engine/types';
import { tickPool } from './pool';
import {
  addLiveEnemy,
  flatMat,
  forEachLiveEnemy,
  gridOf,
  isStomp,
  makeBody,
  playerRect,
  rectsOverlap,
  worldAccent,
  worldTint,
} from './shared';
import type { Body, EnemyHandle } from './shared';

const INK = '#1B1233';
const CREAM = '#FFF6E8';

type DeathKind = 'squish' | 'flip';

/** Shared lifecycle: physics body, player-overlap checks, death anims. */
export abstract class EnemyBase implements EntityInstance, EnemyHandle {
  readonly object3D: THREE.Object3D = new THREE.Group();
  readonly isBoss: boolean = false;
  protected body: Body;
  protected theme: ThemeKey;
  protected dir: 1 | -1 = -1;
  protected t = 0;
  protected touchCd = 0;
  private dead = false;
  protected deathT = -1;
  private deathKind: DeathKind = 'squish';
  private flipVy = 0;

  constructor(e: EntitySpawn, ctx: GameContext, w: number, h: number) {
    this.body = makeBody(e.x, e.y, w, h);
    this.theme = ctx.level.theme;
    addLiveEnemy(this);
  }

  aabb(): Rect {
    return { x: this.body.x, y: this.body.y, w: this.body.w, h: this.body.h };
  }

  alive(): boolean {
    return !this.dead && this.deathT < 0 && this.object3D.parent !== null;
  }

  /** archetype behavior hook */
  protected abstract think(dt: number, ctx: GameContext): void;
  /** can this enemy be stomped right now? */
  protected stompable(): boolean {
    return true;
  }
  /** stomp reaction (default: squish + despawn) */
  protected onStomped(ctx: GameContext): void {
    const c = this.center();
    ctx.emit('stomp', { x: c.x, y: c.y });
    this.startDeath('squish');
  }
  /** side-contact reaction (default: hurt the player) */
  protected onTouchPlayer(ctx: GameContext): void {
    this.hurtPlayer(ctx);
  }

  protected hurtPlayer(ctx: GameContext): void {
    if (this.touchCd > 0) return;
    this.touchCd = 0.9;
    ctx.emit('damage');
  }

  protected center(): { x: number; y: number } {
    return { x: this.body.x + this.body.w / 2, y: this.body.y + this.body.h / 2 };
  }

  protected startDeath(kind: DeathKind): void {
    if (this.deathT >= 0) return;
    this.deathKind = kind;
    this.deathT = 0;
    this.flipVy = 7;
  }

  hitByShot(ctx: GameContext): void {
    if (!this.alive()) return;
    const c = this.center();
    ctx.emit('stomp', { x: c.x, y: c.y });
    this.startDeath('flip');
  }

  hitByShell(ctx: GameContext): void {
    if (!this.alive()) return;
    const c = this.center();
    ctx.emit('stomp', { x: c.x, y: c.y });
    ctx.emit('score', { n: 200 });
    this.startDeath('flip');
  }

  /** gravity + tile collision; returns true while on ground */
  protected stepPhysics(dt: number, ctx: GameContext): boolean {
    this.body.vy = Math.max(this.body.vy - GRAVITY * dt, -18);
    moveAndCollide(this.body, gridOf(ctx), dt);
    return this.body.onGround;
  }

  /** flip direction when a wall stopped us */
  protected turnAtWall(): void {
    if (this.body.vx === 0) this.dir = this.dir === 1 ? -1 : 1;
  }

  /** flip direction when the tile below the leading edge is missing */
  protected turnAtLedge(ctx: GameContext): void {
    if (!this.body.onGround) return;
    const aheadX = this.dir === 1 ? this.body.x + this.body.w + 0.1 : this.body.x - 0.1;
    if (!ctx.isSolid(Math.floor(aheadX), Math.floor(this.body.y + 0.05) - 1)) {
      this.dir = this.dir === 1 ? -1 : 1;
    }
  }

  update(dt: number, ctx: GameContext): void {
    tickPool(this.object3D, dt, ctx);
    if (this.dead) return;
    if (this.deathT >= 0) {
      this.stepDeath(dt);
      return;
    }
    this.t += dt;
    this.touchCd = Math.max(0, this.touchCd - dt);
    this.think(dt, ctx);
    this.syncMesh();
    this.checkPlayer(ctx);
    if (this.body.y < KILL_Y - 4) this.remove();
  }

  /** pose the mesh from the physics body (object3D origin = bottom center) */
  protected syncMesh(): void {
    this.object3D.position.set(this.body.x + this.body.w / 2, this.body.y, 0);
    this.object3D.rotation.y = this.dir === 1 ? Math.PI : 0;
  }

  protected checkPlayer(ctx: GameContext): void {
    const p = ctx.player;
    if (p.dead || p.anim === 'win' || p.anim === 'pipe') return;
    if (!rectsOverlap(this.aabb(), playerRect(ctx))) return;
    if (p.invincibleKind === 'comet') {
      // comet contact defeat — only comet power kills on touch
      const c = this.center();
      ctx.emit('stomp', { x: c.x, y: c.y });
      this.startDeath('flip');
      return;
    }
    if (p.invincible) return; // hurt flicker: no damage either way
    if (this.stompable() && isStomp(ctx, this.aabb())) this.onStomped(ctx);
    else this.onTouchPlayer(ctx);
  }

  protected stepDeath(dt: number): void {
    this.deathT += dt;
    if (this.deathKind === 'squish') {
      const s = Math.max(0.06, 1 - this.deathT * 5);
      this.object3D.scale.set(1 + (1 - s) * 0.4, s, 1);
      if (this.deathT > 0.35) this.remove();
    } else {
      // flip: pop up, spin, fall through the world
      this.flipVy -= GRAVITY * dt;
      this.object3D.position.y += this.flipVy * dt;
      this.object3D.rotation.x += 9 * dt;
      if (this.deathT > 1.4 || this.object3D.position.y < KILL_Y - 4) this.remove();
    }
  }

  protected remove(): void {
    this.dead = true;
    this.object3D.removeFromParent();
  }
}

// ---------------------------------------------------------------------------
// Waddler — round mushroom-capped walker; turns at walls and ledges
// ---------------------------------------------------------------------------

class Waddler extends EnemyBase {
  private speed = 1.3;
  private cap: THREE.Mesh;
  private bodyMesh: THREE.Mesh;

  constructor(e: EntitySpawn, ctx: GameContext) {
    super(e, ctx, 0.7, 0.7);
    const g = this.object3D;
    const skin = flatMat(worldTint(this.theme, CREAM, 0.2));
    const capMat = flatMat(worldTint(this.theme, '#FF5D7E', 0.45));
    const dotMat = flatMat(CREAM);
    const eyeMat = flatMat(INK, { roughness: 0.3 });

    this.bodyMesh = new THREE.Mesh(new THREE.SphereGeometry(0.33, 12, 10), skin);
    this.bodyMesh.scale.set(1, 0.9, 0.9);
    this.bodyMesh.position.y = 0.3;
    g.add(this.bodyMesh);

    this.cap = new THREE.Mesh(new THREE.SphereGeometry(0.4, 12, 8, 0, Math.PI * 2, 0, Math.PI * 0.55), capMat);
    this.cap.position.y = 0.42;
    g.add(this.cap);
    for (const dx of [-0.18, 0.05, 0.24]) {
      const dot = new THREE.Mesh(new THREE.SphereGeometry(0.06, 6, 5), dotMat);
      dot.position.set(dx, 0.68, 0.22);
      g.add(dot);
    }
    for (const dx of [0.12, -0.1]) {
      const eye = new THREE.Mesh(new THREE.SphereGeometry(0.05, 6, 5), eyeMat);
      eye.position.set(dx, 0.38, 0.3);
      g.add(eye);
    }
    for (const dx of [0.16, -0.16]) {
      const foot = new THREE.Mesh(new THREE.SphereGeometry(0.09, 6, 5), eyeMat);
      foot.position.set(dx, 0.05, 0.05);
      g.add(foot);
    }
  }

  protected think(dt: number, ctx: GameContext): void {
    this.body.vx = this.dir * this.speed;
    this.stepPhysics(dt, ctx);
    this.turnAtWall();
    this.turnAtLedge(ctx);
    // idle wobble
    this.cap.rotation.z = Math.sin(this.t * 9) * 0.08;
    this.bodyMesh.scale.y = 0.9 + Math.sin(this.t * 12) * 0.04;
  }
}

// ---------------------------------------------------------------------------
// Hopper — spring-legged bug; periodic hops toward the player
// ---------------------------------------------------------------------------

class Hopper extends EnemyBase {
  private hopCd = 1.0;
  private legL: THREE.Mesh;
  private legR: THREE.Mesh;

  constructor(e: EntitySpawn, ctx: GameContext) {
    super(e, ctx, 0.6, 0.75);
    const g = this.object3D;
    const skin = flatMat(worldTint(this.theme, '#B7E34C', 0.4));
    const dark = flatMat(INK, { roughness: 0.35 });

    const bodyMesh = new THREE.Mesh(new THREE.IcosahedronGeometry(0.32, 0), skin);
    bodyMesh.position.y = 0.48;
    bodyMesh.scale.set(1, 0.9, 0.9);
    g.add(bodyMesh);

    const eyeW = new THREE.Mesh(new THREE.SphereGeometry(0.11, 8, 6), flatMat(CREAM));
    eyeW.position.set(0.05, 0.56, 0.26);
    g.add(eyeW);
    const pupil = new THREE.Mesh(new THREE.SphereGeometry(0.05, 6, 5), dark);
    pupil.position.set(0.06, 0.56, 0.35);
    g.add(pupil);

    for (const dx of [0.1, -0.08]) {
      const ant = new THREE.Mesh(new THREE.CylinderGeometry(0.015, 0.015, 0.3, 4), dark);
      ant.position.set(dx, 0.82, 0);
      ant.rotation.z = dx > 0 ? -0.4 : 0.4;
      g.add(ant);
      const tip = new THREE.Mesh(new THREE.SphereGeometry(0.04, 6, 5), flatMat(worldAccent(this.theme)));
      tip.position.set(dx + (dx > 0 ? 0.06 : -0.06), 0.97, 0);
      g.add(tip);
    }

    this.legL = new THREE.Mesh(new THREE.CylinderGeometry(0.03, 0.05, 0.36, 5), dark);
    this.legL.position.set(0.14, 0.18, 0);
    this.legL.rotation.z = -0.5;
    g.add(this.legL);
    this.legR = new THREE.Mesh(new THREE.CylinderGeometry(0.03, 0.05, 0.36, 5), dark);
    this.legR.position.set(-0.14, 0.18, 0);
    this.legR.rotation.z = 0.5;
    g.add(this.legR);
  }

  protected think(dt: number, ctx: GameContext): void {
    if (this.body.onGround) {
      this.body.vx *= 0.8;
      this.hopCd -= dt;
      const dx = ctx.player.x - this.body.x;
      this.dir = dx >= 0 ? 1 : -1;
      if (this.hopCd <= 0 && Math.abs(dx) < 14) {
        this.body.vy = 8.2;
        this.body.vx = this.dir * 3.6;
        this.body.onGround = false;
        this.hopCd = 1.3 + Math.random() * 0.4;
      }
      // crouch before the hop
      const crouch = this.hopCd < 0.25 ? 0.75 : 1;
      this.object3D.scale.y = crouch;
    } else {
      this.object3D.scale.y = 1.08;
    }
    this.stepPhysics(dt, ctx);
    if (this.body.vx === 0 && !this.body.onGround) this.dir = this.dir === 1 ? -1 : 1;
    this.legL.rotation.z = -0.5 - (this.body.onGround ? 0 : 0.5);
    this.legR.rotation.z = 0.5 + (this.body.onGround ? 0 : 0.5);
  }
}

// ---------------------------------------------------------------------------
// Turtleaf — leaf-shelled turtle. Stomp -> shell; touch shell -> kick;
// sliding shell defeats enemies, ricochets off walls, can hurt the player.
// ---------------------------------------------------------------------------

type TurtleafState = 'walk' | 'shell' | 'slide';

class Turtleaf extends EnemyBase {
  private state: TurtleafState = 'walk';
  private shellT = 0;
  private walkSpeed = 1.0;
  private slideSpeed = 9;
  private flesh: THREE.Group;
  private shellMesh: THREE.Mesh;

  constructor(e: EntitySpawn, ctx: GameContext) {
    super(e, ctx, 0.75, 0.8);
    const g = this.object3D;
    const shellMat = flatMat(worldTint(this.theme, '#59D99C', 0.4));
    const skin = flatMat(worldTint(this.theme, '#F2E4CE', 0.15));
    const dark = flatMat(INK, { roughness: 0.35 });

    this.shellMesh = new THREE.Mesh(
      new THREE.SphereGeometry(0.44, 12, 9, 0, Math.PI * 2, 0, Math.PI * 0.62),
      shellMat,
    );
    this.shellMesh.position.y = 0.34;
    g.add(this.shellMesh);
    const leaf = new THREE.Mesh(new THREE.ConeGeometry(0.14, 0.3, 5), flatMat(worldAccent(this.theme)));
    leaf.position.set(0, 0.82, 0);
    leaf.rotation.z = 0.5;
    g.add(leaf);

    this.flesh = new THREE.Group();
    const head = new THREE.Mesh(new THREE.SphereGeometry(0.16, 8, 6), skin);
    head.position.set(0.42, 0.42, 0);
    this.flesh.add(head);
    const eye = new THREE.Mesh(new THREE.SphereGeometry(0.045, 6, 5), dark);
    eye.position.set(0.52, 0.48, 0.1);
    this.flesh.add(eye);
    for (const [fx, fz] of [
      [0.22, 0.2],
      [0.22, -0.2],
      [-0.22, 0.2],
      [-0.22, -0.2],
    ] as Array<[number, number]>) {
      const foot = new THREE.Mesh(new THREE.SphereGeometry(0.08, 6, 5), skin);
      foot.position.set(fx, 0.07, fz);
      this.flesh.add(foot);
    }
    g.add(this.flesh);
  }

  protected stompable(): boolean {
    return true;
  }

  protected onStomped(ctx: GameContext): void {
    const c = this.center();
    ctx.emit('stomp', { x: c.x, y: c.y });
    if (this.state === 'slide') {
      // stomp a sliding shell: stop it dead
      this.state = 'shell';
      this.body.vx = 0;
      this.shellT = 0;
    } else if (this.state === 'walk') {
      this.enterShell();
    } else {
      // stomping a stationary shell kicks it away
      this.kick(ctx);
    }
  }

  protected onTouchPlayer(ctx: GameContext): void {
    if (this.state === 'shell') {
      this.kick(ctx);
      return;
    }
    this.hurtPlayer(ctx);
  }

  private enterShell(): void {
    this.state = 'shell';
    this.shellT = 0;
    this.body.vx = 0;
    this.flesh.visible = false;
    this.shellMesh.position.y = 0.28;
    this.shellMesh.scale.set(1.15, 0.85, 1.15);
  }

  private exitShell(): void {
    this.state = 'walk';
    this.flesh.visible = true;
    this.shellMesh.position.y = 0.34;
    this.shellMesh.scale.set(1, 1, 1);
  }

  private kick(ctx: GameContext): void {
    const p = ctx.player;
    const away = this.center().x - (p.x + p.w / 2);
    this.dir = (away >= 0 ? 1 : -1) as 1 | -1;
    this.state = 'slide';
    this.shellT = 0;
    ctx.emit('kickShell');
  }

  protected think(dt: number, ctx: GameContext): void {
    if (this.state === 'walk') {
      this.body.vx = this.dir * this.walkSpeed;
      this.stepPhysics(dt, ctx);
      this.turnAtWall();
      // walks off ledges (classic green shell behavior)
    } else if (this.state === 'shell') {
      this.body.vx = 0;
      this.stepPhysics(dt, ctx);
      this.shellT += dt;
      // wiggle warning then re-emerge
      if (this.shellT > 5.5) this.object3D.rotation.z = Math.sin(this.t * 30) * 0.12;
      if (this.shellT > 7) {
        this.object3D.rotation.z = 0;
        this.exitShell();
      }
    } else {
      // slide
      this.body.vx = this.dir * this.slideSpeed;
      const prevVx = this.body.vx;
      this.stepPhysics(dt, ctx);
      if (this.body.vx === 0 && prevVx !== 0) {
        // ricochet off walls
        this.dir = this.dir === 1 ? -1 : 1;
      }
      this.shellMesh.rotation.z -= this.dir * 14 * dt;
      // defeat other enemies
      const me = this.aabb();
      forEachLiveEnemy((other) => {
        if (other === (this as EnemyHandle)) return;
        if (rectsOverlap(me, other.aabb())) other.hitByShell(ctx);
      });
    }
  }
}

// ---------------------------------------------------------------------------
// Spikepod — unstompable spiky ball; any contact damages the player
// ---------------------------------------------------------------------------

class Spikepod extends EnemyBase {
  private speed = 0.8;

  constructor(e: EntitySpawn, ctx: GameContext) {
    super(e, ctx, 0.62, 0.62);
    const g = this.object3D;
    const coreMat = flatMat(worldTint(this.theme, '#5B3FD4', 0.35));
    const spikeMat = flatMat(worldTint(this.theme, '#C0C8D8', 0.2), { roughness: 0.35 });

    const core = new THREE.Mesh(new THREE.IcosahedronGeometry(0.3, 0), coreMat);
    core.position.y = 0.31;
    g.add(core);
    for (let i = 0; i < 8; i++) {
      const a = (i / 8) * Math.PI * 2;
      const spike = new THREE.Mesh(new THREE.ConeGeometry(0.07, 0.22, 4), spikeMat);
      spike.position.set(Math.cos(a) * 0.33, 0.31 + Math.sin(a) * 0.33, 0);
      spike.rotation.z = a - Math.PI / 2;
      g.add(spike);
    }
    for (const dz of [0.28, -0.28]) {
      const spike = new THREE.Mesh(new THREE.ConeGeometry(0.07, 0.22, 4), spikeMat);
      spike.position.set(0, 0.31, dz);
      spike.rotation.x = dz > 0 ? Math.PI / 2 : -Math.PI / 2;
      g.add(spike);
    }
    const eye = new THREE.Mesh(new THREE.SphereGeometry(0.06, 6, 5), flatMat(INK));
    eye.position.set(0.08, 0.38, 0.28);
    g.add(eye);
  }

  protected stompable(): boolean {
    return false; // unstompable — every contact hurts
  }

  protected checkPlayer(ctx: GameContext): void {
    const p = ctx.player;
    if (p.dead || p.anim === 'win' || p.anim === 'pipe' || p.invincible) return;
    if (rectsOverlap(this.aabb(), playerRect(ctx))) this.hurtPlayer(ctx);
  }

  protected think(dt: number, ctx: GameContext): void {
    this.body.vx = this.dir * this.speed;
    this.stepPhysics(dt, ctx);
    this.turnAtWall();
    this.turnAtLedge(ctx);
    this.object3D.rotation.z = Math.sin(this.t * 6) * 0.15;
  }
}

// ---------------------------------------------------------------------------
// Flapper — bat-bird on a sine flight path
// ---------------------------------------------------------------------------

class Flapper extends EnemyBase {
  private oy: number;
  private ox: number;
  private wingL: THREE.Mesh;
  private wingR: THREE.Mesh;
  private speed = 1.6;

  constructor(e: EntitySpawn, ctx: GameContext) {
    super(e, ctx, 0.85, 0.6);
    this.oy = e.y;
    this.ox = e.x;
    const g = this.object3D;
    const skin = flatMat(worldTint(this.theme, '#9B7BFF', 0.35));
    const wingMat = flatMat(worldTint(this.theme, '#6E54C9', 0.3));

    const bodyMesh = new THREE.Mesh(new THREE.SphereGeometry(0.28, 10, 8), skin);
    bodyMesh.position.y = 0.3;
    bodyMesh.scale.set(1.1, 0.85, 0.85);
    g.add(bodyMesh);
    for (const dx of [0.1, -0.1]) {
      const ear = new THREE.Mesh(new THREE.ConeGeometry(0.07, 0.18, 4), skin);
      ear.position.set(dx, 0.56, 0);
      g.add(ear);
    }
    for (const dx of [0.09, -0.07]) {
      const eye = new THREE.Mesh(new THREE.SphereGeometry(0.05, 6, 5), flatMat('#FFC93C', { emissive: '#E8A50F', emissiveIntensity: 0.5 }));
      eye.position.set(dx, 0.34, 0.24);
      g.add(eye);
    }
    this.wingL = new THREE.Mesh(new THREE.BoxGeometry(0.5, 0.05, 0.3), wingMat);
    this.wingL.position.set(0.5, 0.36, 0);
    g.add(this.wingL);
    this.wingR = new THREE.Mesh(new THREE.BoxGeometry(0.5, 0.05, 0.3), wingMat);
    this.wingR.position.set(-0.5, 0.36, 0);
    g.add(this.wingR);
  }

  protected think(dt: number, ctx: GameContext): void {
    // sine flight: horizontal patrol + vertical bob, no gravity
    this.body.x += this.dir * this.speed * dt;
    const wallAhead = ctx.isSolid(
      Math.floor(this.dir === 1 ? this.body.x + this.body.w + 0.1 : this.body.x - 0.1),
      Math.floor(this.body.y + 0.3),
    );
    if (wallAhead || Math.abs(this.body.x - this.ox) > 7) {
      this.dir = this.dir === 1 ? -1 : 1;
      this.body.x += this.dir * this.speed * dt * 2;
    }
    this.body.y = this.oy + Math.sin(this.t * 2.4) * 1.1;
    const flap = Math.sin(this.t * 14) * 0.55;
    this.wingL.rotation.z = flap;
    this.wingR.rotation.z = -flap;
  }
}

// ---------------------------------------------------------------------------
// Burrower — mole with a gem; pops from the ground periodically
// ---------------------------------------------------------------------------

type BurrowPhase = 'hidden' | 'rising' | 'up' | 'sinking';

class Burrower extends EnemyBase {
  private phase: BurrowPhase = 'hidden';
  private phaseT = 0;
  private popH = 0; // 0..1 visible fraction
  private mound: THREE.Mesh;
  private critter: THREE.Group;

  constructor(e: EntitySpawn, ctx: GameContext) {
    super(e, ctx, 0.7, 0.85);
    const g = this.object3D;
    const skin = flatMat(worldTint(this.theme, '#8A4A2B', 0.3));
    const dark = flatMat(INK, { roughness: 0.35 });

    this.critter = new THREE.Group();
    const bodyMesh = new THREE.Mesh(new THREE.SphereGeometry(0.34, 10, 8), skin);
    bodyMesh.position.y = 0.42;
    bodyMesh.scale.set(1, 1.1, 0.9);
    this.critter.add(bodyMesh);
    const snout = new THREE.Mesh(new THREE.ConeGeometry(0.1, 0.22, 6), flatMat('#F2E4CE'));
    snout.position.set(0, 0.45, 0.36);
    snout.rotation.x = Math.PI / 2;
    this.critter.add(snout);
    for (const dx of [0.12, -0.12]) {
      const eye = new THREE.Mesh(new THREE.SphereGeometry(0.05, 6, 5), dark);
      eye.position.set(dx, 0.58, 0.28);
      this.critter.add(eye);
    }
    const gem = new THREE.Mesh(
      new THREE.OctahedronGeometry(0.12, 0),
      flatMat(worldAccent(this.theme), { emissive: worldAccent(this.theme), emissiveIntensity: 0.4 }),
    );
    gem.position.y = 0.82;
    this.critter.add(gem);
    for (const dx of [0.3, -0.3]) {
      const claw = new THREE.Mesh(new THREE.SphereGeometry(0.09, 6, 5), dark);
      claw.position.set(dx, 0.3, 0.18);
      this.critter.add(claw);
    }
    g.add(this.critter);

    this.mound = new THREE.Mesh(
      new THREE.CylinderGeometry(0.5, 0.6, 0.18, 9),
      flatMat(worldTint(this.theme, '#5E3120', 0.3)),
    );
    this.mound.position.y = 0.09;
    g.add(this.mound);
  }

  protected think(dt: number, _ctx: GameContext): void {
    this.phaseT += dt;
    if (this.phase === 'hidden' && this.phaseT > 2.2) this.setPhase('rising');
    else if (this.phase === 'rising' && this.phaseT > 0.45) this.setPhase('up');
    else if (this.phase === 'up' && this.phaseT > 1.6) this.setPhase('sinking');
    else if (this.phase === 'sinking' && this.phaseT > 0.45) this.setPhase('hidden');

    const target = this.phase === 'rising' || this.phase === 'up' ? 1 : 0;
    this.popH += (target - this.popH) * Math.min(1, dt * 10);
    this.critter.position.y = (this.popH - 1) * 0.8;
    this.critter.visible = this.popH > 0.05;
    this.mound.scale.setScalar(this.popH > 0.05 ? 0.8 : 1);
  }

  private setPhase(p: BurrowPhase): void {
    this.phase = p;
    this.phaseT = 0;
  }

  aabb(): Rect {
    // only the popped-out portion can interact
    const h = this.body.h * this.popH;
    return { x: this.body.x, y: this.body.y, w: this.body.w, h };
  }

  protected stompable(): boolean {
    return this.popH > 0.5;
  }

  protected checkPlayer(ctx: GameContext): void {
    if (this.popH < 0.5) return;
    super.checkPlayer(ctx);
  }
}

// ---------------------------------------------------------------------------
// registrations
// ---------------------------------------------------------------------------

export function registerEnemies(register: (type: string, def: { create(e: EntitySpawn, ctx: GameContext): EntityInstance }) => void): void {
  register('waddler', { create: (e, ctx) => new Waddler(e, ctx) });
  register('hopper', { create: (e, ctx) => new Hopper(e, ctx) });
  register('turtleaf', { create: (e, ctx) => new Turtleaf(e, ctx) });
  register('spikepod', { create: (e, ctx) => new Spikepod(e, ctx) });
  register('flapper', { create: (e, ctx) => new Flapper(e, ctx) });
  register('burrower', { create: (e, ctx) => new Burrower(e, ctx) });
}
