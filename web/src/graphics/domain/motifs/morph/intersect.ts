import type { Vec2 } from "../../shapes.ts";

const cross = (o: Vec2, a: Vec2, b: Vec2): number => (a[0] - o[0]) * (b[1] - o[1]) - (a[1] - o[1]) * (b[0] - o[0]);

const opposite = (u: number, v: number): boolean => (u > 0 && v < 0) || (u < 0 && v > 0);

function segmentsCross(p: Vec2, q: Vec2, r: Vec2, s: Vec2): boolean {
  return opposite(cross(r, s, p), cross(r, s, q)) && opposite(cross(p, q, r), cross(p, q, s));
}

/** Pairs of non-adjacent edges of the closed contour that properly cross each other; O(n²). */
export function selfIntersections(points: readonly Vec2[]): Array<[number, number]> {
  const n = points.length;
  const out: Array<[number, number]> = [];
  for (let i = 0; i < n; i++) {
    const p = points[i], q = points[(i + 1) % n];
    for (let j = i + 2; j < n; j++) {
      if (i === 0 && j === n - 1) continue;
      if (segmentsCross(p, q, points[j], points[(j + 1) % n])) out.push([i, j]);
    }
  }
  return out;
}

export const isSimple = (points: readonly Vec2[]): boolean => selfIntersections(points).length === 0;
