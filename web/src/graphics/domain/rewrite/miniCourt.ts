import { filled, polygon, stroked, type Shape, type Vec2 } from "../shapes.ts";
import type { RewriteEnv } from "./rewrite.ts";
import { lerp } from "../../../shared/math.ts";


/** The deepest mini-scene: a tiny courtyard seen from above inside the far door, a checkered rhombus under a back wall with an arch. */
export function miniCourt(x0: number, y0: number, x1: number, y1: number, env: RewriteEnv): Shape[] {
  const at = (u: number, v: number): Vec2 => [lerp(x0, x1, u), lerp(y0, y1, v)];
  const ink = env.ink;
  const out: Shape[] = [polygon([at(0, 0), at(1, 0), at(1, 1), at(0, 1)], filled(ink.deep, ink.ink, ink.line * 0.6))];
  out.push(polygon([at(0.08, 0.12), at(0.92, 0.12), at(0.92, 0.5), at(0.08, 0.5)], filled(ink.fill, ink.ink, ink.line * 0.5)));
  out.push(polygon([at(0.4, 0.5), at(0.4, 0.3), at(0.5, 0.22), at(0.6, 0.3), at(0.6, 0.5)], filled(ink.deep, ink.ink, ink.line * 0.4)));
  const n = 3;
  const floor = (u: number, v: number): Vec2 => at(0.5 + (u - v) * 0.42, 0.52 + (u + v) * 0.22);
  for (let i = 0; i < n; i++) {
    for (let j = 0; j < n; j++) {
      const q = [floor(i / n, j / n), floor((i + 1) / n, j / n), floor((i + 1) / n, (j + 1) / n), floor(i / n, (j + 1) / n)];
      out.push(polygon(q, (i + j) % 2 === 0 ? filled(ink.accent, ink.ink, ink.line * 0.3) : stroked(ink.ink, ink.line * 0.3)));
    }
  }
  return out;
}
