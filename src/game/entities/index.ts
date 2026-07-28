// ENTITY REGISTRATION SEAM — POD-ENTITIES implementation.
// Registers every entity type: waddler, hopper, turtleaf, spikepod, flapper,
// burrower, platform_h, platform_v, platform_fall, boss, plus the dynamic
// item/projectile types (powerup, ember_shot).
//
// Event subscriptions (powerupSpawn / shoot / bossDown) bridge the dynamic
// spawn + boss-collapse paths the engine does not wire itself.
import { on } from '../engine/events';
import { registerEntity } from '../engine/registry';
import { createBoss, collapseCurrentBoss } from './boss';
import { registerEnemies } from './enemies';
import {
  createEmberShotEntity,
  createPowerupEntity,
  queueEmberShot,
  queuePowerup,
} from './items';
import { registerPlatforms } from './platforms';
import { poolContext } from './pool';

export function registerAllEntities(): void {
  registerEnemies(registerEntity);
  registerPlatforms(registerEntity);
  registerEntity('boss', { create: (e, ctx) => createBoss(e, ctx) });
  registerEntity('powerup', { create: createPowerupEntity });
  registerEntity('ember_shot', { create: createEmberShotEntity });

  // dynamic spawn bridges (engine has no runtime entity-spawn API)
  on('powerupSpawn', ({ kind, x, y }) => queuePowerup(kind, x, y));
  on('shoot', () => queueEmberShot(poolContext()));
  on('bossDown', () => collapseCurrentBoss());
}
