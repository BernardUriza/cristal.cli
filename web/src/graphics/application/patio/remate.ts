import { PERCH } from "../../config/figures.ts";
import type { Rect } from "../../domain/architecture/layout.ts";
import type { Vec3 } from "../../domain/math/vec3.ts";
import { groundAxes } from "../framing.ts";
import type { Footing } from "./sitio.ts";

const EPS = 1e-6;

/** The point of the rectangle nearest the camera: its front corner, or the middle of its front edge when the view runs along an axis. */
function front(r: Rect, depth: readonly [number, number]): [number, number] {
  const pick = (lo: number, hi: number, d: number) => (Math.abs(d) < EPS ? (lo + hi) / 2 : d > 0 ? lo : hi);
  return [pick(r.x0, r.x1, depth[0]), pick(r.z0, r.z1, depth[1])];
}

/** Where a figure stands on a tower crown: a flat roof's centre, or the ledge between the spire's front corner and the roof's, so the spire stands wholly behind it. */
export function perchOn(t: Footing, forward: Vec3): Vec3 {
  if (!t.hole) return [(t.rect.x0 + t.rect.x1) / 2, t.y, (t.rect.z0 + t.rect.z1) / 2];
  const { depth } = groundAxes(forward);
  const m = PERCH.edgeMargin;
  const a = front(t.hole, depth);
  const b = front({ x0: t.rect.x0 + m, x1: t.rect.x1 - m, z0: t.rect.z0 + m, z1: t.rect.z1 - m }, depth);
  const k = PERCH.towardEdge;
  return [a[0] + (b[0] - a[0]) * k, t.y, a[1] + (b[1] - a[1]) * k];
}
