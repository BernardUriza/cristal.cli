import { signedArea } from "../bezier.ts";
import type { Vec2 } from "../shapes.ts";

const cross = (a: Vec2, b: Vec2) => a[0] * b[1] - a[1] * b[0];

/** Sutherland–Hodgman: the part of `subject` inside the convex polygon `clip`, in either winding. */
export function clipConvex(subject: readonly Vec2[], clip: readonly Vec2[]): Vec2[] {
  const k = Math.sign(signedArea(clip)) || 1;
  const side = (p: Vec2, a: Vec2, b: Vec2) => k * cross([b[0] - a[0], b[1] - a[1]], [p[0] - a[0], p[1] - a[1]]);
  const meet = (p: Vec2, q: Vec2, a: Vec2, b: Vec2): Vec2 => {
    const e: Vec2 = [b[0] - a[0], b[1] - a[1]];
    const d: Vec2 = [q[0] - p[0], q[1] - p[1]];
    const t = cross([a[0] - p[0], a[1] - p[1]], e) / (cross(d, e) || 1e-12);
    return [p[0] + d[0] * t, p[1] + d[1] * t];
  };
  let out: Vec2[] = [...subject];
  for (let i = 0; i < clip.length && out.length > 0; i++) {
    const a = clip[i];
    const b = clip[(i + 1) % clip.length];
    const input = out;
    out = [];
    for (let j = 0; j < input.length; j++) {
      const p = input[j];
      const q = input[(j + 1) % input.length];
      const pIn = side(p, a, b) >= -1e-9;
      const qIn = side(q, a, b) >= -1e-9;
      if (qIn && !pIn) out.push(meet(p, q, a, b));
      if (qIn) out.push(q);
      else if (pIn) out.push(meet(p, q, a, b));
    }
  }
  return out;
}
