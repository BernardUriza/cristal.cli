import type { Rect } from "../../domain/architecture/layout.ts";

const CELL = 0.5;

const MAX_RECTS = 8;

type Best = { area: number; r0: number; r1: number; c0: number; c1: number };

function largestFree(free: boolean[][], minCells: number): Best | null {
  const cols = free[0].length;
  const heights = new Array<number>(cols).fill(0);
  let best: Best | null = null;
  free.forEach((row, r) => {
    row.forEach((f, c) => (heights[c] = f ? heights[c] + 1 : 0));
    for (let c0 = 0; c0 < cols; c0++) {
      let h = Infinity;
      for (let c1 = c0; c1 < cols && heights[c1] > 0; c1++) {
        h = Math.min(h, heights[c1]);
        const w = c1 - c0 + 1;
        if (Math.min(h, w) >= minCells && (!best || h * w > best.area)) best = { area: h * w, r0: r - h + 1, r1: r, c0, c1 };
      }
    }
  });
  return best;
}

/** The open ground of `bound` that no `blocked` footprint covers, as the largest free rectangles at least `minSide` wide, largest first. */
export function freeRects(bound: Rect, blocked: readonly Rect[], minSide: number): Rect[] {
  const cols = Math.floor((bound.x1 - bound.x0) / CELL);
  const rows = Math.floor((bound.z1 - bound.z0) / CELL);
  if (cols <= 0 || rows <= 0) return [];
  const x = (c: number) => bound.x0 + c * CELL;
  const z = (r: number) => bound.z0 + r * CELL;
  const covered = (r: number, c: number) => blocked.some((b) => x(c) + CELL > b.x0 && x(c) < b.x1 && z(r) + CELL > b.z0 && z(r) < b.z1);
  const free = Array.from({ length: rows }, (_, r) => Array.from({ length: cols }, (_, c) => !covered(r, c)));
  const out: Rect[] = [];
  for (let k = 0; k < MAX_RECTS; k++) {
    const b = largestFree(free, Math.ceil(minSide / CELL));
    if (!b) break;
    for (let r = b.r0; r <= b.r1; r++) for (let c = b.c0; c <= b.c1; c++) free[r][c] = false;
    out.push({ x0: x(b.c0), x1: x(b.c1 + 1), z0: z(b.r0), z1: z(b.r1 + 1) });
  }
  return out;
}
