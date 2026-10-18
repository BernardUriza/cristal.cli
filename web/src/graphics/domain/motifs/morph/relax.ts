import type { RegionContour } from "./contour.ts";
import { selfIntersections } from "./intersect.ts";

export type Safety = { crossingsAtRequest: number; crossings: number; factor: number; attempts: number; relaxed: boolean };

/** Walks the ladder from the requested strength down until the contour stops crossing itself; factor 0 is the untouched source. */
export function firstSimple<T>(ladder: readonly number[], make: (factor: number) => T, contourOf: (t: T) => RegionContour): { value: T; safety: Safety } {
  if (!ladder.length) throw new Error("la escalera de relajación está vacía");
  let first = -1;
  for (let i = 0; i < ladder.length; i++) {
    const value = make(ladder[i]);
    const crossings = selfIntersections(contourOf(value).points).length;
    if (first < 0) first = crossings;
    if (crossings === 0 || i === ladder.length - 1) return { value, safety: { crossingsAtRequest: first, crossings, factor: ladder[i], attempts: i + 1, relaxed: i > 0 } };
  }
  throw new Error("inalcanzable");
}
