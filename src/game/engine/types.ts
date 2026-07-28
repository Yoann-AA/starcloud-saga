import type * as THREE from 'three';
import type { ThemeKey } from './constants';

export type ThemeName = ThemeKey;

/** Axis-aligned bounding box. x,y = bottom-left corner (y grows upward). */
export interface Rect {
  x: number;
  y: number;
  w: number;
  h: number;
}

export interface Vec2 {
  x: number;
  y: number;
}

export interface EntitySpawn {
  type: string;
  x: number;
  y: number;
  props?: Record<string, unknown>;
}

export interface PipeDef {
  /** left column of the 2-wide pipe */
  x: number;
  /** y of the TOP edge of the pipe (world units, from bottom) */
  top: number;
  /** pipe height in tiles */
  h: number;
  /** optional warp destination */
  dest?: Vec2;
}

/** Raw level JSON (see engine-api.md §"Level JSON schema"). */
export interface LevelData {
  id: string;
  world: number;
  level: number;
  name: string;
  theme: ThemeName;
  timeLimit: number;
  parTime: number;
  width: number;
  height: number;
  spawn: Vec2;
  /** row 0 = TOP row; last row = ground line. Each row `width` chars. */
  tiles: string[];
  entities: EntitySpawn[];
  pipes: PipeDef[];
  flagX: number;
}

/** Level list metadata (levels/index.ts seam). */
export interface LevelMeta {
  id: string;
  world: number;
  level: number;
  name: string;
  theme: ThemeName;
  parTime: number;
}

/** Player input frame (keyboard or touch). */
export interface InputState {
  left: boolean;
  right: boolean;
  jump: boolean;
  run: boolean;
  down: boolean;
  /** ember-shot trigger (X key); run is Shift-only */
  shoot: boolean;
}

export type PowerState = 'small' | 'berry' | 'ember' | 'comet';

export type PlayerAnim =
  | 'idle' | 'run' | 'skid' | 'jump' | 'fall' | 'crouch' | 'pipe' | 'dead' | 'win';

/** Snapshot of the player exposed to entities / fx / audio via context. */
export interface PlayerSnapshot {
  x: number;
  y: number;
  w: number;
  h: number;
  vx: number;
  vy: number;
  onGround: boolean;
  facing: 1 | -1;
  power: PowerState;
  anim: PlayerAnim;
  /** true during hurt flicker OR comet power — no damage taken */
  invincible: boolean;
  /** distinguishes post-damage flicker from comet power ('comet' kills on contact) */
  invincibleKind: 'hurt' | 'comet' | null;
  dead: boolean;
}

/** A live entity in the level (POD-ENTITIES implements these). */
export interface EntityInstance {
  update(dt: number, ctx: GameContext): void;
  object3D: THREE.Object3D;
  aabb(): Rect;
  onStomp?(): void;
  onTouch?(): void;
  solid?: boolean;
}

export interface EntityDef {
  create(e: EntitySpawn, ctx: GameContext): EntityInstance;
}

/** Context handed to entity updates each fixed step. */
export interface GameContext {
  level: LevelData;
  player: PlayerSnapshot;
  /** seconds since level start (simulation time) */
  time: number;
  /** emit a game event (see engine/events.ts) */
  emit: (type: string, payload?: Record<string, unknown>) => void;
  /** solid query at tile coords (x,y from bottom; out of bounds horizontally = solid walls) */
  isSolid: (tx: number, ty: number) => boolean;
}
