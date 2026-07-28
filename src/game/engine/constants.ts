// Physics constants — engine-api.md §"Physics & units". Do not change without
// updating the contract; level design depends on these exact values.

/** 1 tile = 1 world unit. */
export const TILE = 1;

/** Fixed simulation timestep (seconds). */
export const FIXED_DT = 1 / 120;

export const GRAVITY = 38;
export const JUMP_VEL = 13.5;
export const JUMP_CUTOFF_MULT = 0.45;
export const WALK_MAX = 6;
export const RUN_MAX = 10;
export const ACCEL = 40;
export const FRICTION = 32;
export const COYOTE = 0.1;
export const JUMP_BUFFER = 0.12;
export const MAX_FALL = 18;

/** Player AABB sizes (width × height, world units). */
export const PLAYER_SMALL = { w: 0.6, h: 0.8 } as const;
export const PLAYER_GROWN = { w: 0.7, h: 1.5 } as const;

/** Kill plane: falling below this y means death. */
export const KILL_Y = -6;

/** Stomp bounce: 60% of jump velocity, full when jump held. */
export const STOMP_BOUNCE_MULT = 0.6;

/** Spring launch velocity. */
export const SPRING_VEL = 20;

/** Per-theme rendering palettes (design.md §3 world identity colors). */
export const THEMES = {
  meadow: {
    skyTop: '#7EC8FF', skyBottom: '#C9F0FF', fog: '#A8DCF0',
    ground: '#59D99C', groundDark: '#3E9E6E', dirt: '#8FE388',
    brick: '#D97B4F', question: '#FFC93C', pipe: '#3FBF7F',
    hillFar: '#6FBF9A', hillNear: '#4FA97E', ambient: '#FFF2D9',
  },
  desert: {
    skyTop: '#FFD98A', skyBottom: '#FFF1C9', fog: '#F2D9A0',
    ground: '#F2B84B', groundDark: '#C78F30', dirt: '#E07B3F',
    brick: '#C96F3B', question: '#FFC93C', pipe: '#3FBF7F',
    hillFar: '#E0A55F', hillNear: '#C78F4A', ambient: '#FFEFC9',
  },
  snow: {
    skyTop: '#A8C8F0', skyBottom: '#E8F4FF', fog: '#C8DCF2',
    ground: '#9ADCF5', groundDark: '#6FB0D0', dirt: '#EAF7FF',
    brick: '#7FA8C8', question: '#FFC93C', pipe: '#3FBF7F',
    hillFar: '#B8D4EA', hillNear: '#9AC0DC', ambient: '#EAF4FF',
  },
  sky: {
    skyTop: '#6FA8FF', skyBottom: '#E3EEFF', fog: '#A8C4F5',
    ground: '#7FB0FF', groundDark: '#5A88D9', dirt: '#FFFFFF',
    brick: '#8FA8E0', question: '#FFC93C', pipe: '#3FBF7F',
    hillFar: '#9FBCF0', hillNear: '#86A5E8', ambient: '#F0F6FF',
  },
  jungle: {
    skyTop: '#6FBF8A', skyBottom: '#D9F2C2', fog: '#9CD4A8',
    ground: '#2FA36B', groundDark: '#1F7A4D', dirt: '#B7E34C',
    brick: '#7A6A4F', question: '#FFC93C', pipe: '#3FBF7F',
    hillFar: '#57A878', hillNear: '#3E8F60', ambient: '#EDF7D9',
  },
  crystal: {
    skyTop: '#3B2D6E', skyBottom: '#6E5BB5', fog: '#4A3A85',
    ground: '#9B7BFF', groundDark: '#6E54C9', dirt: '#59E3D9',
    brick: '#5A4A9E', question: '#FFC93C', pipe: '#3FBF7F',
    hillFar: '#4A3A85', hillNear: '#5B4A9E', ambient: '#C9BCFF',
  },
  volcano: {
    skyTop: '#B33B2E', skyBottom: '#4A1F1F', fog: '#7A3226',
    ground: '#8A4A2B', groundDark: '#5E3120', dirt: '#FF6B35',
    brick: '#4A2A1A', question: '#FFC93C', pipe: '#3FBF7F',
    hillFar: '#6E2F22', hillNear: '#8A3A26', ambient: '#FFC9A8',
  },
  fortress: {
    skyTop: '#1B1233', skyBottom: '#3D2A6E', fog: '#2A1B4A',
    ground: '#5B3FD4', groundDark: '#3E2A8F', dirt: '#2A1B4A',
    brick: '#33245E', question: '#FFC93C', pipe: '#3FBF7F',
    hillFar: '#2A1B4A', hillNear: '#3D2A6E', ambient: '#B8A8FF',
  },
} as const;

export type ThemeKey = keyof typeof THEMES;
