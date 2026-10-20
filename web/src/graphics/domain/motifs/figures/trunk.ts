import { polygonArea } from "../../bezier.ts";
import type { Vec2 } from "../../shapes.ts";
import { REGIONS, type RegionAnchors } from "./regions.ts";

export type TrunkTuning = { samples: number; margin: number; minShare: number };

export type Trunk = { mask: Vec2[]; box: [Vec2, Vec2]; head: Vec2[] };

function nearest(poly: readonly Vec2[], p: Vec2): number {
  let best = 0, bestD = Infinity;
  poly.forEach((q, i) => {
    const d = (q[0] - p[0]) ** 2 + (q[1] - p[1]) ** 2;
    if (d < bestD) { bestD = d; best = i; }
  });
  return best;
}

function arc(poly: readonly Vec2[], from: number, to: number): Vec2[] {
  const span = (to - from + poly.length) % poly.length;
  return Array.from({ length: span + 1 }, (_, i) => poly[(from + i) % poly.length]);
}

const mean = (pts: readonly Vec2[]): Vec2 => [pts.reduce((s, p) => s + p[0], 0) / pts.length, pts.reduce((s, p) => s + p[1], 0) / pts.length];


/** The longest run of the polygon's interior on the line coord[along] = s, as an interval of the other coordinate. */
function chord(poly: readonly Vec2[], along: 0 | 1, s: number): [number, number] | undefined {
  const across = 1 - along;
  const hits: number[] = [];
  poly.forEach((p, i) => {
    const q = poly[(i + 1) % poly.length];
    if ((p[along] <= s) === (q[along] <= s)) return;
    hits.push(p[across] + ((s - p[along]) / (q[along] - p[along])) * (q[across] - p[across]));
  });
  hits.sort((a, b) => a - b);
  let best: [number, number] | undefined;
  for (let k = 0; k + 1 < hits.length; k += 2) if (!best || hits[k + 1] - hits[k] > best[1] - best[0]) best = [hits[k], hits[k + 1]];
  return best;
}

function clipHalf(poly: readonly Vec2[], axis: 0 | 1, limit: number, keepBelow: boolean): Vec2[] {
  const inside = (p: Vec2) => (keepBelow ? p[axis] <= limit : p[axis] >= limit);
  const out: Vec2[] = [];
  poly.forEach((p, i) => {
    const q = poly[(i + 1) % poly.length];
    if (inside(p)) out.push(p);
    if (inside(p) !== inside(q)) {
      const t = (limit - p[axis]) / (q[axis] - p[axis]);
      out.push([p[0] + t * (q[0] - p[0]), p[1] + t * (q[1] - p[1])]);
    }
  });
  return out;
}

function clipToBox(poly: readonly Vec2[], [lo, hi]: [Vec2, Vec2]): Vec2[] {
  return clipHalf(clipHalf(clipHalf(clipHalf(poly, 0, lo[0], false), 0, hi[0], true), 1, lo[1], false), 1, hi[1], true);
}

/** The torso of a silhouette from its semantic anchors: between the head arc and the tail arc, as deep as every sampled cross-section allows, minus a margin. */
export function trunkOf(poly: readonly Vec2[], regions: RegionAnchors, t: TrunkTuning): Trunk | undefined {
  const idx = REGIONS.map((r) => nearest(poly, regions[r]));
  const head = arc(poly, idx[0], idx[1]);
  const tail = arc(poly, idx[2], idx[3]);
  const H = mean(head), T = mean(tail);
  const along: 0 | 1 = Math.abs(T[0] - H[0]) >= Math.abs(T[1] - H[1]) ? 0 : 1;
  const dir = Math.sign(T[along] - H[along]) || 1;
  const s0 = Math.max(...head.map((p) => p[along] * dir));
  const s1 = Math.min(...tail.map((p) => p[along] * dir));
  if (!(s1 > s0)) return undefined;
  let lo = -Infinity, hi = Infinity;
  for (let k = 1; k <= t.samples; k++) {
    const c = chord(poly, along, (s0 + ((s1 - s0) * k) / (t.samples + 1)) * dir);
    if (!c) return undefined;
    lo = Math.max(lo, c[0]);
    hi = Math.min(hi, c[1]);
  }
  if (!(hi > lo)) return undefined;
  const a0 = Math.min(s0 * dir, s1 * dir), a1 = Math.max(s0 * dir, s1 * dir);
  const m = t.margin * Math.min(a1 - a0, hi - lo);
  const corner = (a: number, b: number): Vec2 => (along === 0 ? [a, b] : [b, a]);
  const box: [Vec2, Vec2] = [corner(a0 + m, lo + m), corner(a1 - m, hi - m)];
  if ((a1 - a0 - 2 * m) * (hi - lo - 2 * m) < t.minShare * polygonArea(poly)) return undefined;
  const mask = clipToBox(poly, box);
  return mask.length >= 3 ? { mask, box, head } : undefined;
}
