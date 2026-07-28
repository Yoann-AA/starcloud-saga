import type { LevelData, Rect } from './types';

/**
 * Solid tile grid. Tile coords: x grows right, y grows UP, y=0 is the bottom
 * row of the level. Level JSON rows are top-first, so row r maps to
 * y = height - 1 - r.
 */
export interface SolidGrid {
  width: number;
  height: number;
  /** solid query in tile coords; outside horizontal bounds = solid (walls), below 0 = not solid (pit) */
  isSolid: (tx: number, ty: number) => boolean;
  /** raw tile char at tile coords ('.' when empty/out of bounds) */
  tileAt: (tx: number, ty: number) => string;
}

/** Tile chars that are solid for movement. */
const SOLID_TILES = new Set(['#', 'B', '?', 'M', 'F', 'S', 'U', 'X']);

export function isSolidChar(ch: string): boolean {
  return SOLID_TILES.has(ch);
}

/** Build the collision grid for a level. Pipes auto-fill solid cells. */
export function buildSolidGrid(level: LevelData): SolidGrid {
  const { width, height } = level;
  const solid = new Uint8Array(width * height);
  const chars: string[] = new Array<string>(width * height).fill('.');

  for (let r = 0; r < level.tiles.length && r < height; r++) {
    const row = level.tiles[r];
    const ty = height - 1 - r;
    for (let x = 0; x < width && x < row.length; x++) {
      const ch = row[x];
      chars[ty * width + x] = ch;
      if (SOLID_TILES.has(ch)) solid[ty * width + x] = 1;
    }
  }

  // Pipes are not tiles — fill their 2-wide × h-tall rect as solid.
  for (const pipe of level.pipes ?? []) {
    const bottom = Math.round(pipe.top - pipe.h);
    for (let x = pipe.x; x < pipe.x + 2; x++) {
      for (let y = bottom; y < pipe.top; y++) {
        if (x >= 0 && x < width && y >= 0 && y < height) solid[y * width + x] = 1;
      }
    }
  }

  const isSolid = (tx: number, ty: number): boolean => {
    if (tx < 0 || tx >= width) return true; // level walls
    if (ty < 0 || ty >= height) return false; // pits below, open sky above
    return solid[ty * width + tx] === 1;
  };

  const tileAt = (tx: number, ty: number): string => {
    if (tx < 0 || tx >= width || ty < 0 || ty >= height) return '.';
    return chars[ty * width + tx];
  };

  return { width, height, isSolid, tileAt };
}

/** A physics body: AABB with velocity, x,y = bottom-left corner. */
export interface Body extends Rect {
  vx: number;
  vy: number;
  onGround: boolean;
  /** set true for one step when the head hits a ceiling */
  hitHead: boolean;
  /** tile coords of the ceiling cell that was hit (when hitHead) */
  headTileX: number;
  headTileY: number;
}

export function makeBody(x: number, y: number, w: number, h: number): Body {
  return { x, y, w, h, vx: 0, vy: 0, onGround: false, hitHead: false, headTileX: -1, headTileY: -1 };
}

export function rectsOverlap(a: Rect, b: Rect): boolean {
  return a.x < b.x + b.w && a.x + a.w > b.x && a.y < b.y + b.h && a.y + a.h > b.y;
}

/** Does any solid tile overlap this rect? */
export function rectHitsSolid(grid: SolidGrid, r: Rect): boolean {
  const x0 = Math.floor(r.x);
  const x1 = Math.floor(r.x + r.w - 1e-9);
  const y0 = Math.floor(r.y);
  const y1 = Math.floor(r.y + r.h - 1e-9);
  for (let ty = y0; ty <= y1; ty++) {
    for (let tx = x0; tx <= x1; tx++) {
      if (grid.isSolid(tx, ty)) return true;
    }
  }
  return false;
}

/**
 * Move a body and resolve collisions against the solid grid (axis-separated).
 * Mutates and returns `body`. Pure w.r.t. inputs (no globals, no rendering).
 */
export function moveAndCollide(body: Body, grid: SolidGrid, dt: number): Body {
  body.hitHead = false;
  body.headTileX = -1;
  body.headTileY = -1;

  // --- X axis ---
  body.x += body.vx * dt;
  {
    const x0 = Math.floor(body.x);
    const x1 = Math.floor(body.x + body.w - 1e-9);
    const y0 = Math.floor(body.y);
    const y1 = Math.floor(body.y + body.h - 1e-9);
    for (let ty = y0; ty <= y1; ty++) {
      for (let tx = x0; tx <= x1; tx++) {
        if (!grid.isSolid(tx, ty)) continue;
        if (body.vx > 0) body.x = tx - body.w - 1e-6;
        else if (body.vx < 0) body.x = tx + 1 + 1e-6;
        body.vx = 0;
        break;
      }
    }
  }

  // --- Y axis ---
  const wasFalling = body.vy <= 0;
  body.y += body.vy * dt;
  body.onGround = false;
  {
    const x0 = Math.floor(body.x);
    const x1 = Math.floor(body.x + body.w - 1e-9);
    const y0 = Math.floor(body.y);
    const y1 = Math.floor(body.y + body.h - 1e-9);
    for (let ty = y0; ty <= y1; ty++) {
      for (let tx = x0; tx <= x1; tx++) {
        if (!grid.isSolid(tx, ty)) continue;
        if (body.vy <= 0 && wasFalling) {
          body.y = ty + 1 + 1e-6;
          body.vy = 0;
          body.onGround = true;
        } else if (body.vy > 0) {
          body.y = ty - body.h - 1e-6;
          body.vy = 0;
          body.hitHead = true;
          body.headTileX = tx;
          body.headTileY = ty;
        }
        break;
      }
    }
  }

  return body;
}
