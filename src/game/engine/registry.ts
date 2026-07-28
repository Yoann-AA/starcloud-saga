import type { EntityDef } from './types';

// EntityDef / EntityInstance live in types.ts (engine-api.md); re-exported
// here for convenience.
export type { EntityDef, EntityInstance } from './types';

const registry = new Map<string, EntityDef>();

export function registerEntity(type: string, def: EntityDef): void {
  registry.set(type, def);
}

export function getEntity(type: string): EntityDef | undefined {
  return registry.get(type);
}

/** Test/helper: drop all registrations. */
export function clearEntities(): void {
  registry.clear();
}
