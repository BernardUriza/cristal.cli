import type { MorphPolicy } from "../../../config/morph.ts";
import type { Vec2 } from "../../shapes.ts";
import { REGIONS, type Region } from "../figures/regions.ts";
import { regionSlice, regionStart, type RegionContour } from "./contour.ts";
import { firstSimple, type Safety } from "./relax.ts";
import { applySim, IDENTITY, procrustes, simFromPair, type Similarity } from "./similarity.ts";

export type RegionWeights = Partial<Record<Region, number>>;

export type RegionSource = { region: Region; weight: number; from: string; start: number; count: number };

export type Hybrid = { contour: RegionContour; provenance: { algorithm: string; align: boolean; keepScale: number; regions: RegionSource[]; safety?: Safety } };

const lerp = (p: Vec2, q: Vec2, w: number): Vec2 => [p[0] + (q[0] - p[0]) * w, p[1] + (q[1] - p[1]) * w];

function attach(p0: Vec2, p1: Vec2, t0: Vec2, t1: Vec2, keepScale: number): (p: Vec2, s: number) => Vec2 {
  const chord = simFromPair(p0, p1, t0, t1);
  const mag = Math.hypot(chord.s[0], chord.s[1]);
  const k = Math.pow(mag, -keepScale);
  const m: Similarity = { s: [chord.s[0] * k, chord.s[1] * k], t: [0, 0] };
  const q0 = applySim(m, p0);
  m.t = [t0[0] - q0[0], t0[1] - q0[1]];
  const e = applySim(m, p1);
  return (p, s) => { const q = applySim(m, p); return [q[0] + (t1[0] - e[0]) * s, q[1] + (t1[1] - e[1]) * s]; };
}

function sourceOf(a: string, b: string, w: number): string {
  return w <= 0 ? a : w >= 1 ? b : `${a}×${b}`;
}

function rawBlend(a: RegionContour, b: RegionContour, weights: RegionWeights, keepScale: number, align: boolean): Hybrid {
  if (a.perRegion !== b.perRegion) throw new Error(`particiones distintas: ${a.perRegion} vs ${b.perRegion}`);
  const toA = align ? procrustes(b.points, a.points) : IDENTITY;
  const bA: RegionContour = { ...b, points: b.points.map((p) => applySim(toA, p)) };
  const w = REGIONS.map((r) => Math.min(1, Math.max(0, weights[r] ?? 0)));
  const n = REGIONS.length;
  const target = REGIONS.map((_, k) => lerp(regionStart(a, k), regionStart(bA, k), Math.min(w[k], w[(k + n - 1) % n])));
  const points: Vec2[] = [];
  const regions: RegionSource[] = [];
  REGIONS.forEach((region, k) => {
    const t0 = target[k], t1 = target[(k + 1) % n];
    const sa = attach(regionStart(a, k), regionStart(a, k + 1), t0, t1, keepScale);
    const sb = attach(regionStart(bA, k), regionStart(bA, k + 1), t0, t1, keepScale);
    const pa = regionSlice(a, k), pb = regionSlice(bA, k);
    regions.push({ region, weight: w[k], from: sourceOf(a.id, b.id, w[k]), start: points.length, count: pa.length });
    pa.forEach((p, i) => points.push(lerp(sa(p, i / pa.length), sb(pb[i], i / pa.length), w[k])));
  });
  const id = `${a.id}+${b.id}`;
  return { contour: { id, points, perRegion: a.perRegion }, provenance: { algorithm: "anclas_semanticas+arco@1.0.0", align, keepScale, regions } };
}

const scaled = (w: RegionWeights, f: number): RegionWeights => Object.fromEntries(Object.entries(w).map(([r, v]) => [r, Number(((v ?? 0) * f).toFixed(4))]));

/** Region blend that never crosses itself: every weight shrinks by the same ladder factor until the contour is simple, and the provenance says so. */
export function blendByRegion(a: RegionContour, b: RegionContour, weights: RegionWeights, policy: Pick<MorphPolicy, "keepScale" | "relaxLadder">, align = true): Hybrid {
  const r = firstSimple(policy.relaxLadder, (f) => rawBlend(a, b, scaled(weights, f), policy.keepScale, align), (h) => h.contour);
  return { contour: r.value.contour, provenance: { ...r.value.provenance, algorithm: "anclas_semanticas+arco+sin_autocruce@1.1.0", safety: r.safety } };
}
