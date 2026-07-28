// LEVEL REGISTRY — POD-CONTENT: 32 original levels (8 worlds x 4).
import type { LevelData, LevelMeta } from '../engine/types';
import w1_1 from './w1-1.json';
import w1_2 from './w1-2.json';
import w1_3 from './w1-3.json';
import w1_4 from './w1-4.json';
import w2_1 from './w2-1.json';
import w2_2 from './w2-2.json';
import w2_3 from './w2-3.json';
import w2_4 from './w2-4.json';
import w3_1 from './w3-1.json';
import w3_2 from './w3-2.json';
import w3_3 from './w3-3.json';
import w3_4 from './w3-4.json';
import w4_1 from './w4-1.json';
import w4_2 from './w4-2.json';
import w4_3 from './w4-3.json';
import w4_4 from './w4-4.json';
import w5_1 from './w5-1.json';
import w5_2 from './w5-2.json';
import w5_3 from './w5-3.json';
import w5_4 from './w5-4.json';
import w6_1 from './w6-1.json';
import w6_2 from './w6-2.json';
import w6_3 from './w6-3.json';
import w6_4 from './w6-4.json';
import w7_1 from './w7-1.json';
import w7_2 from './w7-2.json';
import w7_3 from './w7-3.json';
import w7_4 from './w7-4.json';
import w8_1 from './w8-1.json';
import w8_2 from './w8-2.json';
import w8_3 from './w8-3.json';
import w8_4 from './w8-4.json';

/** All registered levels, in play order. */
export const LEVELS: LevelMeta[] = [
  { id: '1-1', world: 1, level: 1, name: 'Cloverfield Dawn', theme: 'meadow', parTime: 25},
  { id: '1-2', world: 1, level: 2, name: 'Dewdrop Run', theme: 'meadow', parTime: 30},
  { id: '1-3', world: 1, level: 3, name: 'Petalbrook Crossing', theme: 'meadow', parTime: 30},
  { id: '1-4', world: 1, level: 4, name: 'Bramblekeep Gate', theme: 'meadow', parTime: 20},
  { id: '2-1', world: 2, level: 1, name: 'Sunspill Dunes', theme: 'desert', parTime: 30},
  { id: '2-2', world: 2, level: 2, name: 'Terracotta Trail', theme: 'desert', parTime: 30},
  { id: '2-3', world: 2, level: 3, name: 'Mirage Mesa', theme: 'desert', parTime: 35},
  { id: '2-4', world: 2, level: 4, name: 'Cindervault Ruins', theme: 'desert', parTime: 20},
  { id: '3-1', world: 3, level: 1, name: 'Frostwhisker Fields', theme: 'snow', parTime: 30},
  { id: '3-2', world: 3, level: 2, name: 'Shiverpine Slope', theme: 'snow', parTime: 30},
  { id: '3-3', world: 3, level: 3, name: 'Glacierglow Grotto', theme: 'snow', parTime: 35},
  { id: '3-4', world: 3, level: 4, name: 'Palefang Keep', theme: 'snow', parTime: 20},
  { id: '4-1', world: 4, level: 1, name: 'Cloudline Drift', theme: 'sky', parTime: 30},
  { id: '4-2', world: 4, level: 2, name: 'Nimbus Steps', theme: 'sky', parTime: 35},
  { id: '4-3', world: 4, level: 3, name: 'Zephyr Heights', theme: 'sky', parTime: 35},
  { id: '4-4', world: 4, level: 4, name: 'Stormroc Roost', theme: 'sky', parTime: 20},
  { id: '5-1', world: 5, level: 1, name: 'Mossveil March', theme: 'jungle', parTime: 30},
  { id: '5-2', world: 5, level: 2, name: 'Canopy Crawl', theme: 'jungle', parTime: 35},
  { id: '5-3', world: 5, level: 3, name: 'Vinecoil Hollow', theme: 'jungle', parTime: 35},
  { id: '5-4', world: 5, level: 4, name: 'Overgrowth Bastion', theme: 'jungle', parTime: 20},
  { id: '6-1', world: 6, level: 1, name: 'Glimmerdeep', theme: 'crystal', parTime: 30},
  { id: '6-2', world: 6, level: 2, name: 'Prismfall Caverns', theme: 'crystal', parTime: 35},
  { id: '6-3', world: 6, level: 3, name: 'Echoing Shard Gallery', theme: 'crystal', parTime: 35},
  { id: '6-4', world: 6, level: 4, name: 'Crystalfang Sanctum', theme: 'crystal', parTime: 20},
  { id: '7-1', world: 7, level: 1, name: 'Ashen Ascent', theme: 'volcano', parTime: 30},
  { id: '7-2', world: 7, level: 2, name: 'Magmawash Flats', theme: 'volcano', parTime: 30},
  { id: '7-3', world: 7, level: 3, name: 'Cindercone Ridge', theme: 'volcano', parTime: 35},
  { id: '7-4', world: 7, level: 4, name: "Pyrelord's Crucible", theme: 'volcano', parTime: 25},
  { id: '8-1', world: 8, level: 1, name: 'Umbrawall Approach', theme: 'fortress', parTime: 30},
  { id: '8-2', world: 8, level: 2, name: 'Nightveil Ramparts', theme: 'fortress', parTime: 30},
  { id: '8-3', world: 8, level: 3, name: 'Hollowstar Gaol', theme: 'fortress', parTime: 35},
  { id: '8-4', world: 8, level: 4, name: 'Umbra Throne', theme: 'fortress', parTime: 20},
];

/** levelId → full level data (static JSON imports: works in Vite AND tsx). */
export const LEVEL_DATA: Record<string, LevelData> = {
  '1-1': w1_1 as LevelData,
  '1-2': w1_2 as LevelData,
  '1-3': w1_3 as LevelData,
  '1-4': w1_4 as LevelData,
  '2-1': w2_1 as LevelData,
  '2-2': w2_2 as LevelData,
  '2-3': w2_3 as LevelData,
  '2-4': w2_4 as LevelData,
  '3-1': w3_1 as LevelData,
  '3-2': w3_2 as LevelData,
  '3-3': w3_3 as LevelData,
  '3-4': w3_4 as LevelData,
  '4-1': w4_1 as LevelData,
  '4-2': w4_2 as LevelData,
  '4-3': w4_3 as LevelData,
  '4-4': w4_4 as LevelData,
  '5-1': w5_1 as LevelData,
  '5-2': w5_2 as LevelData,
  '5-3': w5_3 as LevelData,
  '5-4': w5_4 as LevelData,
  '6-1': w6_1 as LevelData,
  '6-2': w6_2 as LevelData,
  '6-3': w6_3 as LevelData,
  '6-4': w6_4 as LevelData,
  '7-1': w7_1 as LevelData,
  '7-2': w7_2 as LevelData,
  '7-3': w7_3 as LevelData,
  '7-4': w7_4 as LevelData,
  '8-1': w8_1 as LevelData,
  '8-2': w8_2 as LevelData,
  '8-3': w8_3 as LevelData,
  '8-4': w8_4 as LevelData,
};

/** The level that is always playable from a fresh save. */
export const FIRST_LEVEL_ID = '1-1';
