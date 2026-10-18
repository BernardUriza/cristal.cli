import type { Vec2 } from "../../../shapes.ts";
import { inside } from "./contact.ts";
import { toWorld } from "./frame.ts";
import { unitPolygon } from "./kinds.ts";
import { layoutBody } from "./resolve.ts";
import type { BodyGraph } from "./types.ts";

function segmentsCross(a: Vec2, b: Vec2, c: Vec2, d: Vec2): boolean {
  const o = (p: Vec2, q: Vec2, r: Vec2) => Math.sign((q[0] - p[0]) * (r[1] - p[1]) - (q[1] - p[1]) * (r[0] - p[0]));
  return o(a, b, c) !== o(a, b, d) && o(c, d, a) !== o(c, d, b);
}

export const silhouettesTouch = (p: readonly Vec2[], q: readonly Vec2[]): boolean =>
  p.some((v) => inside(q, v)) || q.some((v) => inside(p, v)) || p.some((a, i) => q.some((c, j) => segmentsCross(a, p[(i + 1) % p.length], c, q[(j + 1) % q.length])));

/** Connected components of a body's laid-out silhouettes: two pieces join when their outlines overlap. */
export function silhouetteComponents(g: BodyGraph): number {
  const polys = layoutBody(g).placed.filter((p) => unitPolygon(p.node.kind).length).map((p) => unitPolygon(p.node.kind).map((q) => toWorld(p.frame, q)));
  const seen = new Set<number>();
  let n = 0;
  for (let s = 0; s < polys.length; s++) {
    if (seen.has(s)) continue;
    n++;
    const stack = [s];
    seen.add(s);
    while (stack.length) {
      const i = stack.pop()!;
      polys.forEach((q, j) => {
        if (!seen.has(j) && silhouettesTouch(polys[i], q)) (seen.add(j), stack.push(j));
      });
    }
  }
  return n;
}
