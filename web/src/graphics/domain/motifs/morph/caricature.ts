import type { Vec2 } from "../../shapes.ts";
import type { RegionContour } from "./contour.ts";
import { applySim, invertSim, mean, procrustes } from "./similarity.ts";

function normalized(points: readonly Vec2[]): Vec2[] {
  const c = mean(points);
  const rms = Math.sqrt(points.reduce((s, p) => s + (p[0] - c[0]) ** 2 + (p[1] - c[1]) ** 2, 0) / points.length) || 1;
  return points.map((p) => [(p[0] - c[0]) / rms, (p[1] - c[1]) / rms]);
}

export function motifNorm(set: readonly RegionContour[], iterations: number): RegionContour {
  const n = set[0].points.length;
  if (set.some((c) => c.points.length !== n)) throw new Error("la norma exige la misma partición en todos los motivos");
  let ref = normalized(set[0].points);
  for (let it = 0; it < iterations; it++) {
    const aligned = set.map((c) => c.points.map((p) => applySim(procrustes(c.points, ref), p)));
    ref = normalized(ref.map((_, i) => mean(aligned.map((pts) => pts[i]))));
  }
  return { id: "norma", points: ref, perRegion: set[0].perRegion };
}

export function caricature(f: RegionContour, norm: RegionContour, k: number): RegionContour {
  const toNorm = procrustes(f.points, norm.points);
  const back = invertSim(toNorm);
  const points = f.points.map((p, i) => {
    const q = applySim(toNorm, p), m = norm.points[i];
    return applySim(back, [m[0] + k * (q[0] - m[0]), m[1] + k * (q[1] - m[1])]);
  });
  return { id: `${f.id}~k${k}`, points, perRegion: f.perRegion };
}
