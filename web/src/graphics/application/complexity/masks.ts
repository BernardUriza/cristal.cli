import type { Vec2 } from "../../domain/shapes.ts";
import type { Grid } from "./raster.ts";

export type MaskShape = { areaPx: number; centroid: Vec2; width: number; height: number; radial: number[] };

/** Area, centroid, box and farthest reach per angular bin of every group of cells; `groupOf` maps an owner to its group or −1. */
export function measureMasks(owner: Int32Array, grid: Grid, groups: number, groupOf: (owner: number) => number, bins: number): MaskShape[] {
  const { cols, cell } = grid;
  const n = new Float64Array(groups), sx = new Float64Array(groups), sy = new Float64Array(groups);
  const c0 = new Float64Array(groups).fill(Infinity), c1 = new Float64Array(groups).fill(-Infinity);
  const r0 = new Float64Array(groups).fill(Infinity), r1 = new Float64Array(groups).fill(-Infinity);
  const group = new Int32Array(owner.length);
  for (let i = 0; i < owner.length; i++) {
    const g = owner[i] < 0 ? -1 : groupOf(owner[i]);
    group[i] = g;
    if (g < 0) continue;
    const c = i % cols, r = (i - c) / cols;
    n[g]++; sx[g] += c; sy[g] += r;
    c0[g] = Math.min(c0[g], c); c1[g] = Math.max(c1[g], c); r0[g] = Math.min(r0[g], r); r1[g] = Math.max(r1[g], r);
  }
  const cx = Array.from(n, (k, g) => (k ? (sx[g] / k + 0.5) * cell : 0));
  const cy = Array.from(n, (k, g) => (k ? (sy[g] / k + 0.5) * cell : 0));
  const radial = new Float64Array(groups * bins);
  for (let i = 0; i < group.length; i++) {
    const g = group[i];
    if (g < 0) continue;
    const c = i % cols, r = (i - c) / cols;
    const dx = (c + 0.5) * cell - cx[g], dy = (r + 0.5) * cell - cy[g];
    const turn = (Math.atan2(dy, dx) + Math.PI * 2) % (Math.PI * 2);
    const b = Math.min(bins - 1, Math.floor((turn / (Math.PI * 2)) * bins));
    radial[g * bins + b] = Math.max(radial[g * bins + b], Math.hypot(dx, dy) + cell / 2);
  }
  return Array.from({ length: groups }, (_, g) => ({
    areaPx: n[g] * cell * cell,
    centroid: [cx[g], cy[g]] as Vec2,
    width: n[g] ? (c1[g] - c0[g] + 1) * cell : 0,
    height: n[g] ? (r1[g] - r0[g] + 1) * cell : 0,
    radial: Array.from(radial.subarray(g * bins, (g + 1) * bins)),
  }));
}
