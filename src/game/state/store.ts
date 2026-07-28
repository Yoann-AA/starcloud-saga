import { create } from 'zustand';
import { persist } from 'zustand/middleware';
import { LEVELS } from '../levels/index';
import type { PowerState } from '../engine/types';

export type RunStatus = 'intro' | 'playing' | 'paused' | 'dead' | 'complete' | 'gameover' | 'win';

export interface ProgressState {
  /** ids of unlocked levels (first level is implicitly always unlocked) */
  unlocked: string[];
  /** levelId → 0..3 stars */
  stars: Record<string, number>;
  /** levelId → best coin count */
  bestCoins: Record<string, number>;
}

export interface SettingsState {
  master: number;
  music: number;
  sfx: number;
  muted: boolean;
}

export interface RunState {
  lives: number;
  coins: number;
  score: number;
  world: number;
  level: number;
  levelId: string;
  timeLeft: number;
  deaths: number;
  continues: number;
  status: RunStatus;
  /** live player power state, synced from the sim each frame */
  power: PowerState;
}

interface GameStore {
  progress: ProgressState;
  settings: SettingsState;
  run: RunState;

  startLevel: (levelId: string, world: number, level: number) => void;
  setStatus: (status: RunStatus) => void;
  setTimeLeft: (t: number) => void;
  setPower: (p: PowerState) => void;
  addCoin: (n?: number) => void;
  addScore: (n: number) => void;
  loseLife: () => void;
  addLife: () => void;
  useContinue: () => void;
  unlockNext: (levelId: string, stars: number) => void;
  recordCoins: (levelId: string, coins: number) => void;
  setSettings: (s: Partial<SettingsState>) => void;
  resetRun: () => void;
}

const DEFAULT_RUN: RunState = {
  lives: 3,
  coins: 0,
  score: 0,
  world: 1,
  level: 1,
  levelId: 'debug-1',
  timeLeft: 300,
  deaths: 0,
  continues: 3,
  status: 'intro',
  power: 'small' as PowerState,
};

export const useGameStore = create<GameStore>()(
  persist(
    (set) => ({
      progress: { unlocked: [], stars: {}, bestCoins: {} },
      settings: { master: 0.8, music: 0.7, sfx: 0.9, muted: false },
      run: { ...DEFAULT_RUN },

      startLevel: (levelId, world, level) =>
        set((s) => ({
          run: {
            ...s.run,
            levelId,
            world,
            level,
            lives: s.run.lives > 0 ? s.run.lives : 3,
            status: 'intro',
            power: 'small' as PowerState,
          },
        })),

      setStatus: (status) => set((s) => ({ run: { ...s.run, status } })),

      setTimeLeft: (t) => set((s) => ({ run: { ...s.run, timeLeft: t } })),

      setPower: (p) => set((s) => ({ run: { ...s.run, power: p } })),

      addCoin: (n = 1) =>
        set((s) => {
          let coins = s.run.coins + n;
          let lives = s.run.lives;
          while (coins >= 100) {
            coins -= 100;
            lives += 1;
          }
          return { run: { ...s.run, coins, lives } };
        }),

      addScore: (n) => set((s) => ({ run: { ...s.run, score: s.run.score + n } })),

      loseLife: () =>
        set((s) => ({
          run: { ...s.run, lives: s.run.lives - 1, deaths: s.run.deaths + 1 },
        })),

      addLife: () => set((s) => ({ run: { ...s.run, lives: s.run.lives + 1 } })),

      useContinue: () =>
        set((s) => ({
          run: { ...s.run, continues: Math.max(0, s.run.continues - 1), lives: 3 },
        })),

      unlockNext: (levelId, stars) =>
        set((s) => {
          // record stars on the cleared level, unlock the NEXT level in order
          const idx = LEVELS.findIndex((m) => m.id === levelId);
          const nextId = idx >= 0 && idx + 1 < LEVELS.length ? LEVELS[idx + 1].id : null;
          const unlocked = new Set(s.progress.unlocked);
          unlocked.add(levelId);
          if (nextId) unlocked.add(nextId);
          const prevStars = s.progress.stars[levelId] ?? 0;
          return {
            progress: {
              ...s.progress,
              unlocked: [...unlocked],
              stars: { ...s.progress.stars, [levelId]: Math.max(prevStars, stars) },
            },
          };
        }),

      recordCoins: (levelId, coins) =>
        set((s) => ({
          progress: {
            ...s.progress,
            bestCoins: {
              ...s.progress.bestCoins,
              [levelId]: Math.max(s.progress.bestCoins[levelId] ?? 0, coins),
            },
          },
        })),

      setSettings: (patch) => set((s) => ({ settings: { ...s.settings, ...patch } })),

      resetRun: () => set({ run: { ...DEFAULT_RUN } }),
    }),
    {
      name: 'starcloud-saga-save',
      partialize: (s) => ({ progress: s.progress, settings: s.settings }),
    },
  ),
);

/** Total stars earned across all levels. */
export function selectTotalStars(s: { progress: ProgressState }): number {
  return Object.values(s.progress.stars).reduce((a, b) => a + b, 0);
}
