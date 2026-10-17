import type { Vec2 } from "../../domain/shapes.ts";

export type Grid = { cols: number; rows: number; cell: number };

export function makeGrid(width: number, height: number, cell: number): Grid {
  return { cols: Math.max(1, Math.ceil(width / cell)), rows: Math.max(1, Math.ceil(height / cell)), cell };
}

/** Visits every cell whose centre lies inside the polygon (even-odd scanline). */
export function fillPolygon(points: readonly Vec2[], grid: Grid, visit: (index: number) => void): void {
  const { cols, rows, cell } = grid;
  let y0 = Infinity, y1 = -Infinity;
  for (const p of points) { y0 = Math.min(y0, p[1]); y1 = Math.max(y1, p[1]); }
  const r0 = Math.max(0, Math.ceil(y0 / cell - 0.5));
  const r1 = Math.min(rows - 1, Math.floor(y1 / cell - 0.5));
  const xs: number[] = [];
  for (let r = r0; r <= r1; r++) {
    const yc = (r + 0.5) * cell;
    xs.length = 0;
    for (let i = 0; i < points.length; i++) {
      const [ax, ay] = points[i];
      const [bx, by] = points[(i + 1) % points.length];
      if ((ay <= yc && by > yc) || (by <= yc && ay > yc)) xs.push(ax + ((yc - ay) * (bx - ax)) / (by - ay));
    }
    xs.sort((a, b) => a - b);
    for (let k = 0; k + 1 < xs.length; k += 2) {
      const c0 = Math.max(0, Math.ceil(xs[k] / cell - 0.5));
      const c1 = Math.min(cols - 1, Math.floor(xs[k + 1] / cell - 0.5));
      for (let c = c0; c <= c1; c++) visit(r * cols + c);
    }
  }
}
