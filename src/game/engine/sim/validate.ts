// LEVEL VALIDATOR CLI — `npm run validate-levels`.
// Checks every level registered in src/game/levels/index.ts:
//   schema fields, tile row widths == width, spawn/flag bounds,
//   and that the greedy bot can complete the level within timeLimit.
// Exits non-zero on any failure.
import process from 'node:process';
import { THEMES } from '../constants';
import { buildSolidGrid } from '../physics';
import { LEVELS, LEVEL_DATA } from '../../levels/index';
import { simulateLevel } from './bot';
import type { LevelData } from '../types';

interface Failure {
  id: string;
  message: string;
}

const failures: Failure[] = [];

function fail(id: string, message: string): void {
  failures.push({ id, message });
}

function validateSchema(level: LevelData): void {
  const id = level.id ?? '(unknown)';
  if (typeof level.id !== 'string' || !level.id) fail(id, 'missing id');
  if (typeof level.world !== 'number' || typeof level.level !== 'number') {
    fail(id, 'world/level must be numbers');
  }
  if (typeof level.name !== 'string' || !level.name) fail(id, 'missing name');
  if (!(level.theme in THEMES)) fail(id, `unknown theme "${String(level.theme)}"`);
  if (typeof level.timeLimit !== 'number' || level.timeLimit <= 0) fail(id, 'bad timeLimit');
  if (typeof level.parTime !== 'number' || level.parTime <= 0) fail(id, 'bad parTime');
  if (typeof level.width !== 'number' || typeof level.height !== 'number') fail(id, 'bad dims');

  if (!Array.isArray(level.tiles)) {
    fail(id, 'tiles must be an array of rows');
    return;
  }
  if (level.tiles.length !== level.height) {
    fail(id, `tiles has ${level.tiles.length} rows, expected height ${level.height}`);
  }
  level.tiles.forEach((row, i) => {
    if (row.length !== level.width) {
      fail(id, `row ${i} width ${row.length} != ${level.width}`);
    }
  });

  const { spawn, flagX } = level;
  if (!spawn || spawn.x < 0 || spawn.x >= level.width || spawn.y < 0 || spawn.y >= level.height) {
    fail(id, `spawn out of bounds (${spawn?.x}, ${spawn?.y})`);
  }
  if (typeof flagX !== 'number' || flagX < 5 || flagX > level.width - 2) {
    fail(id, `flagX ${String(flagX)} out of sane bounds [5, ${level.width - 2}]`);
  }

  // spawn cell must not be inside solid geometry
  const grid = buildSolidGrid(level);
  if (grid.isSolid(Math.floor(spawn.x), Math.floor(spawn.y))) {
    fail(id, 'spawn point is inside a solid tile');
  }
  // flag column must be reachable ground-wise: something solid at or below y=2 near flag
  let flagGround = false;
  for (let ty = Math.min(4, level.height - 1); ty >= 0; ty--) {
    if (grid.isSolid(Math.floor(flagX), ty)) {
      flagGround = true;
      break;
    }
  }
  if (!flagGround) fail(id, 'no ground near flagpole');

  for (const pipe of level.pipes ?? []) {
    if (pipe.x < 0 || pipe.x + 1 >= level.width) fail(id, `pipe at x=${pipe.x} out of bounds`);
    if (pipe.top <= 0 || pipe.top > level.height) fail(id, `pipe top ${pipe.top} out of bounds`);
    if (pipe.dest && (pipe.dest.x < 0 || pipe.dest.x >= level.width)) {
      fail(id, 'pipe dest out of bounds');
    }
  }
}

function main(): void {
  console.log(`Validating ${LEVELS.length} level(s)…\n`);

  const ids = new Set<string>();
  for (const meta of LEVELS) {
    if (ids.has(meta.id)) fail(meta.id, 'duplicate level id in LEVELS');
    ids.add(meta.id);
    const data = LEVEL_DATA[meta.id];
    if (!data) {
      fail(meta.id, 'listed in LEVELS but missing from LEVEL_DATA');
      continue;
    }

    validateSchema(data);

    const result = simulateLevel(data);
    if (!result.completed) {
      fail(meta.id, `bot failed to complete (${result.reason} after ${result.timeMs}ms)`);
    }
    console.log(
      `  ${result.completed ? '✓' : '✗'} ${meta.id} "${meta.name}" — bot ${
        result.completed ? `completed in ${(result.timeMs / 1000).toFixed(1)}s` : `FAILED: ${result.reason}`
      } (limit ${data.timeLimit}s)`,
    );
  }

  for (const id of Object.keys(LEVEL_DATA)) {
    if (!ids.has(id)) fail(id, 'present in LEVEL_DATA but not listed in LEVELS');
  }

  if (failures.length > 0) {
    console.error(`\n${failures.length} validation failure(s):`);
    for (const f of failures) console.error(`  ✗ [${f.id}] ${f.message}`);
    process.exit(1);
  }
  console.log('\nAll levels valid and bot-completable.');
  process.exit(0);
}

main();
