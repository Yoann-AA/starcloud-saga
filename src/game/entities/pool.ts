// Dynamic entity pool — ENGINE GAP WORKAROUND.
// The engine only instantiates entities listed in level JSON; it has no API
// for runtime spawns (power-up items on `powerupSpawn`, ember shots on
// `shoot`). This pool subscribes to those events (wired in index.ts) and is
// ticked from the update() of regular level entities — exactly once per sim
// step, guarded by ctx.time. Pool objects attach to the engine's shared
// entity group (the parent of any level entity's object3D).
import type * as THREE from 'three';
import type { EntityInstance, GameContext, LevelData } from '../engine/types';

export interface PoolEntity extends EntityInstance {
  /** true once the entity has finished and removed its object3D */
  done(): boolean;
}

let entities: PoolEntity[] = [];
let parent: THREE.Object3D | null = null;
let levelRef: LevelData | null = null;
let lastTick = -1;
let ctxRef: GameContext | null = null;
const pending: Array<(ctx: GameContext) => PoolEntity | null> = [];

/** Latest sim context (null before the first entity tick of a level). */
export function poolContext(): GameContext | null {
  return ctxRef;
}

/** Queue a dynamic spawn; the factory runs on the next sim step. */
export function poolSpawn(factory: (ctx: GameContext) => PoolEntity | null): void {
  pending.push(factory);
}

/** Count live pool entities matching a predicate (used to cap ember shots). */
export function poolCount(pred: (e: PoolEntity) => boolean): number {
  let n = 0;
  for (const e of entities) if (pred(e)) n++;
  return n;
}

/**
 * Called at the top of every level-entity update. Refreshes the attach
 * parent, resets on level change, and ticks the pool once per sim step.
 */
export function tickPool(host: THREE.Object3D, dt: number, ctx: GameContext): void {
  ctxRef = ctx;
  if (host.parent) parent = host.parent;
  if (levelRef !== ctx.level) {
    levelRef = ctx.level;
    entities = [];
    pending.length = 0;
    lastTick = -1;
  }
  if (lastTick === ctx.time) return;
  lastTick = ctx.time;

  if (parent) {
    while (pending.length > 0) {
      const factory = pending.shift();
      if (!factory) break;
      const e = factory(ctx);
      if (e) {
        entities.push(e);
        parent.add(e.object3D);
      }
    }
  }

  const survivors: PoolEntity[] = [];
  for (const e of entities) {
    e.update(dt, ctx);
    if (e.done()) e.object3D.removeFromParent();
    else survivors.push(e);
  }
  entities = survivors;
}
