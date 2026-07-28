// HEADLESS LEVEL SIMULATOR — pure TS, no React, no Three.js.
// Reuses the exact same physics + player step as the live game so
// `npm run validate-levels` proves levels are beatable.
import { FIXED_DT } from '../constants';
import { buildSolidGrid } from '../physics';
import type { SolidGrid } from '../physics';
import { createPlayer, stepPlayer } from '../player';
import type { PlayerSim } from '../player';
import type { InputState, LevelData } from '../types';

export interface SimResult {
  completed: boolean;
  /** simulated seconds until completion/failure */
  timeMs: number;
  reason: 'flag' | 'timeout' | 'died';
}

export interface BotMemory {
  jumpHold: number;
}

export type BotPolicy = (
  p: PlayerSim,
  grid: SolidGrid,
  level: LevelData,
  mem: BotMemory,
) => InputState;

/**
 * Default greedy policy: hold right + run; jump (with a hold so jumps reach
 * full height) when a wall is ahead, a gap opens within a short lookahead,
 * or the level demands height. Gaps up to ~7 tiles clear at run speed.
 */
export const greedyPolicy: BotPolicy = (p, grid, _level, mem) => {
  const input: InputState = { left: false, right: true, jump: false, run: true, down: false, shoot: false };

  if (!p.onGround) {
    // keep holding jump while ascending for full height
    input.jump = mem.jumpHold > 0 && p.vy > 0;
    mem.jumpHold = Math.max(0, mem.jumpHold - FIXED_DT);
    return input;
  }

  const feetTy = Math.floor(p.y + 0.05);
  const aheadX = p.x + p.w;

  // wall ahead at foot or mid height within 1.2 tiles?
  let wallAhead = false;
  for (const reach of [0.6, 1.2]) {
    const tx = Math.floor(aheadX + reach);
    if (grid.isSolid(tx, feetTy) || grid.isSolid(tx, feetTy + 1)) {
      wallAhead = true;
      break;
    }
  }

  // gap ahead: no ground below the ground line within 2 tiles lookahead
  let gapAhead = false;
  for (const reach of [0.8, 1.6]) {
    const tx = Math.floor(aheadX + reach);
    let groundFound = false;
    for (let ty = feetTy - 1; ty >= Math.max(0, feetTy - 3); ty--) {
      if (grid.isSolid(tx, ty)) {
        groundFound = true;
        break;
      }
    }
    if (!groundFound) {
      gapAhead = true;
      break;
    }
  }

  if (wallAhead || gapAhead) {
    mem.jumpHold = 0.3;
    input.jump = true;
  }

  return input;
};

/** Simulate a level with a policy. Runs at the fixed 1/120 timestep. */
export function simulateLevel(
  level: LevelData,
  policy: BotPolicy = greedyPolicy,
): SimResult {
  const grid = buildSolidGrid(level);
  const player = createPlayer(level.spawn);
  const mem: BotMemory = { jumpHold: 0 };
  const maxSteps = Math.ceil(level.timeLimit / FIXED_DT);

  let time = 0;
  for (let step = 0; step < maxSteps; step++) {
    const input = policy(player, grid, level, mem);
    stepPlayer(player, input, grid, level, FIXED_DT);
    time += FIXED_DT;

    if (player.flag) {
      return { completed: true, timeMs: Math.round(time * 1000), reason: 'flag' };
    }
    if (player.dead && player.y < -20) {
      return { completed: false, timeMs: Math.round(time * 1000), reason: 'died' };
    }
    if (player.dead && player.deathTimer > 3) {
      return { completed: false, timeMs: Math.round(time * 1000), reason: 'died' };
    }
  }
  return { completed: false, timeMs: Math.round(maxSteps * FIXED_DT * 1000), reason: 'timeout' };
}

// Dev QA hook (engine-api.md): window.__sim exposes the headless simulator.
declare global {
  interface Window {
    __sim?: { simulateLevel: typeof simulateLevel; greedyPolicy: BotPolicy };
  }
}
if (
  typeof window !== 'undefined' &&
  (import.meta as ImportMeta & { env?: { DEV?: boolean } }).env?.DEV
) {
  window.__sim = { simulateLevel, greedyPolicy };
}
