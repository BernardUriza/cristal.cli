import type { DisplayList } from "../../domain/shapes.ts";
import type { ComplexityTuning } from "../../config/complexity.ts";
import { flattenLeaves, leafBox, type Leaf } from "./leaves.ts";
import type { BandCoverage, DetailBand } from "./types.ts";

export type { DetailBand } from "./types.ts";

export const DETAIL_BANDS: readonly DetailBand[] = [0, 1, 2, 3];

export function detailBand(sizePx: number): DetailBand {
  if (sizePx < 8) return 0;
  if (sizePx < 32) return 1;
  if (sizePx < 128) return 2;
  return 3;
}

type Grid = { cols: number; rows: number; cell: number };

function markBox(cells: Set<number>, grid: Grid, box: { x0: number; y0: number; x1: number; y1: number }): void {
  const c0 = Math.max(0, Math.floor(box.x0 / grid.cell));
  const c1 = Math.min(grid.cols - 1, Math.max(c0, Math.ceil(box.x1 / grid.cell) - 1));
  const r0 = Math.max(0, Math.floor(box.y0 / grid.cell));
  const r1 = Math.min(grid.rows - 1, Math.max(r0, Math.ceil(box.y1 / grid.cell) - 1));
  for (let r = r0; r <= r1; r++) for (let c = c0; c <= c1; c++) cells.add(r * grid.cols + c);
}

function insideClosed(points: readonly [number, number][], x: number, y: number): boolean {
  let inside = false;
  for (let i = 0, j = points.length - 1; i < points.length; j = i++) {
    const [xi, yi] = points[i];
    const [xj, yj] = points[j];
    if (yi > y !== yj > y && x < ((xj - xi) * (y - yi)) / (yj - yi) + xi) inside = !inside;
  }
  return inside;
}

function markInterior(cells: Set<number>, grid: Grid, leaf: Leaf): void {
  const box = leafBox(leaf);
  const c0 = Math.max(0, Math.floor(box.x0 / grid.cell));
  const c1 = Math.min(grid.cols - 1, Math.floor(box.x1 / grid.cell));
  const r0 = Math.max(0, Math.floor(box.y0 / grid.cell));
  const r1 = Math.min(grid.rows - 1, Math.floor(box.y1 / grid.cell));
  let hit = false;
  for (let r = r0; r <= r1; r++) {
    for (let c = c0; c <= c1; c++) {
      if (!insideClosed(leaf.points as [number, number][], (c + 0.5) * grid.cell, (r + 0.5) * grid.cell)) continue;
      cells.add(r * grid.cols + c);
      hit = true;
    }
  }
  if (!hit) markSegments(cells, grid, leaf);
}

function markSegments(cells: Set<number>, grid: Grid, leaf: Leaf): void {
  const pts = leaf.points;
  for (let i = 0; i + 1 < pts.length; i++) {
    const [ax, ay] = pts[i];
    const [bx, by] = pts[i + 1];
    const steps = Math.max(1, Math.ceil((2 * Math.hypot(bx - ax, by - ay)) / grid.cell));
    for (let s = 0; s <= steps; s++) {
      const x = ax + ((bx - ax) * s) / steps;
      const y = ay + ((by - ay) * s) / steps;
      markBox(cells, grid, { x0: x, y0: y, x1: x, y1: y });
    }
  }
}

export function leafSizePx(leaf: Leaf): number {
  const b = leafBox(leaf);
  return Math.max(b.x1 - b.x0, b.y1 - b.y0);
}

export function multiscaleCoverage(list: DisplayList, width: number, height: number, tuning: ComplexityTuning): BandCoverage[] {
  const grid: Grid = { cols: Math.max(1, Math.ceil(width / tuning.cellPx)), rows: Math.max(1, Math.ceil(height / tuning.cellPx)), cell: tuning.cellPx };
  const cells = DETAIL_BANDS.map(() => new Set<number>());
  const canvasArea = width * height;
  for (const leaf of flattenLeaves(list, tuning.circleSegments)) {
    const box = leafBox(leaf);
    if (leaf.closed && (box.x1 - box.x0) * (box.y1 - box.y0) > canvasArea * tuning.backgroundAreaRatio) continue;
    const target = cells[detailBand(leafSizePx(leaf))];
    if (leaf.closed) markInterior(target, grid, leaf);
    else markSegments(target, grid, leaf);
  }
  const total = grid.cols * grid.rows;
  return DETAIL_BANDS.map((band) => ({ band, areaPct: (100 * cells[band].size) / total }));
}
