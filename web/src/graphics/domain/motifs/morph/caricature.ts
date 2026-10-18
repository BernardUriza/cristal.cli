import type { MorphFamily, MorphPolicy } from "../../../config/morph.ts";
import type { Vec2 } from "../../shapes.ts";
import type { RegionContour } from "./contour.ts";
import { firstSimple, type Safety } from "./relax.ts";
import { applySim, invertSim, mean, scaleFit } from "./similarity.ts";

export type Caricature = { contour: RegionContour; provenance: { algorithm: string; norm: string; requestedK: number; k: number; safety: Safety } };

function normalized(points: readonly Vec2[]): Vec2[] {
  const c = mean(points);
  const rms = Math.sqrt(points.reduce((s, p) => s + (p[0] - c[0]) ** 2 + (p[1] - c[1]) ** 2, 0) / points.length) || 1;
  return points.map((p) => [(p[0] - c[0]) / rms, (p[1] - c[1]) / rms]);
}

/** Generalized mean shape under scale + translation (no rotation: the motifs are drawn upright). */
export function motifNorm(set: readonly RegionContour[], iterations: number, id = "norma"): RegionContour {
  const n = set[0].points.length;
  if (set.some((c) => c.points.length !== n)) throw new Error("la norma exige la misma partición en todos los motivos");
  let ref = normalized(set[0].points);
  for (let it = 0; it < iterations; it++) {
    const aligned = set.map((c) => c.points.map((p) => applySim(scaleFit(c.points, ref), p)));
    ref = normalized(ref.map((_, i) => mean(aligned.map((pts) => pts[i]))));
  }
  return { id, points: ref, perRegion: set[0].perRegion };
}

export function familyOf(motif: string, policy: Pick<MorphPolicy, "families">): MorphFamily | undefined {
  return (Object.keys(policy.families) as MorphFamily[]).find((f) => policy.families[f].indexOf(motif) >= 0);
}

function smoothed(d: readonly Vec2[], w: number): Vec2[] {
  const n = d.length;
  return d.map((_, i) => {
    let x = 0, y = 0;
    for (let j = -w; j <= w; j++) {
      const e = d[(i + j + n) % n];
      x += e[0];
      y += e[1];
    }
    return [x / (2 * w + 1), y / (2 * w + 1)];
  });
}

/** Moves every point away from the norm by (k−1) times the low-pass difference; k=1 is the identity. */
export function exaggerate(f: RegionContour, norm: RegionContour, k: number, smoothing: number): RegionContour {
  const toNorm = scaleFit(f.points, norm.points);
  const back = invertSim(toNorm);
  const q = f.points.map((p) => applySim(toNorm, p));
  const d = smoothed(q.map((p, i): Vec2 => [p[0] - norm.points[i][0], p[1] - norm.points[i][1]]), smoothing);
  const points = q.map((p, i) => applySim(back, [p[0] + (k - 1) * d[i][0], p[1] + (k - 1) * d[i][1]]));
  return { id: `${f.id}~k${k}`, points, perRegion: f.perRegion };
}

/** Brennan's caricature that never crosses itself: k walks the ladder toward 1 until the contour is simple. */
export function caricature(f: RegionContour, norm: RegionContour, k: number, policy: Pick<MorphPolicy, "relaxLadder" | "smoothing">): Caricature {
  const kAt = (s: number) => Number((1 + (k - 1) * s).toFixed(4));
  const r = firstSimple(policy.relaxLadder, (s) => exaggerate(f, norm, kAt(s), policy.smoothing), (c) => c);
  return { contour: r.value, provenance: { algorithm: "caricatura_brennan+paso_bajo+sin_autocruce@1.1.0", norm: norm.id, requestedK: k, k: kAt(r.safety.factor), safety: r.safety } };
}
