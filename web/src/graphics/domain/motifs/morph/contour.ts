import type { Vec2 } from "../../shapes.ts";
import { REGIONS } from "../figures/regions.ts";
import type { MotifDef } from "../figures/types.ts";

export type RegionContour = { id: string; points: Vec2[]; perRegion: number };

export function arcResample(path: readonly Vec2[], n: number): Vec2[] {
  const cum = [0];
  for (let i = 1; i < path.length; i++) cum.push(cum[i - 1] + Math.hypot(path[i][0] - path[i - 1][0], path[i][1] - path[i - 1][1]));
  const total = cum[cum.length - 1];
  const out: Vec2[] = [];
  let j = 0;
  for (let k = 0; k < n; k++) {
    const d = (total * k) / n;
    while (j < path.length - 2 && cum[j + 1] < d) j++;
    const seg = cum[j + 1] - cum[j];
    const t = seg < 1e-12 ? 0 : (d - cum[j]) / seg;
    out.push([path[j][0] + (path[j + 1][0] - path[j][0]) * t, path[j][1] + (path[j + 1][1] - path[j][1]) * t]);
  }
  return out;
}

function nearestIndex(poly: readonly Vec2[], p: Vec2): number {
  let best = 0, bestD = Infinity;
  poly.forEach((q, i) => {
    const d = (q[0] - p[0]) ** 2 + (q[1] - p[1]) ** 2;
    if (d < bestD) { bestD = d; best = i; }
  });
  return best;
}

export function regionIndices(poly: readonly Vec2[], anchors: readonly Vec2[]): number[] {
  const idx = anchors.map((p) => nearestIndex(poly, p));
  const offsets = idx.map((i) => (i - idx[0] + poly.length) % poly.length);
  for (let k = 1; k < offsets.length; k++) {
    if (offsets[k] <= offsets[k - 1]) throw new Error(`anclas fuera de orden en el contorno: ${idx.join(",")}`);
  }
  return idx;
}

export function sampleRegions(id: string, poly: readonly Vec2[], anchors: readonly Vec2[], perRegion: number): RegionContour {
  const idx = regionIndices(poly, anchors);
  const points: Vec2[] = [];
  idx.forEach((start, k) => {
    const end = idx[(k + 1) % idx.length];
    const span = (end - start + poly.length) % poly.length;
    const path = Array.from({ length: span + 1 }, (_, i) => poly[(start + i) % poly.length]);
    points.push(...arcResample(path, perRegion));
  });
  return { id, points, perRegion };
}

export function motifContour(m: MotifDef, perRegion: number): RegionContour {
  const poly = m.silhouette({ size: 1, detail: 1, fill: "", ink: "", accent: "" });
  return sampleRegions(m.id, poly, REGIONS.map((r) => m.regions[r]), perRegion);
}

export function regionSlice(c: RegionContour, k: number): Vec2[] {
  return c.points.slice(k * c.perRegion, (k + 1) * c.perRegion);
}

export function regionStart(c: RegionContour, k: number): Vec2 {
  return c.points[(k % REGIONS.length) * c.perRegion];
}
