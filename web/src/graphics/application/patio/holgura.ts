import { FIGURE_EXTENT } from "../../config/framing.ts";
import type { Box3, Vec3 } from "../../domain/math/vec3.ts";
import { groundAxes } from "../framing.ts";

type Slab = { centre: [number, number]; u: [number, number]; v: [number, number]; halfU: number; halfV: number; y0: number; y1: number };

const dot2 = (a: readonly [number, number], b: readonly [number, number]) => a[0] * b[0] + a[1] * b[1];

function apart(s: Slab, b: Box3): boolean {
  if (b.max[1] <= s.y0 + 1e-6 || b.min[1] >= s.y1) return true;
  const c: [number, number] = [(b.min[0] + b.max[0]) / 2, (b.min[2] + b.max[2]) / 2];
  const hx = (b.max[0] - b.min[0]) / 2;
  const hz = (b.max[2] - b.min[2]) / 2;
  const d: [number, number] = [c[0] - s.centre[0], c[1] - s.centre[1]];
  const axes: [number, number][] = [[1, 0], [0, 1], s.u, s.v];
  return axes.some((a) => {
    const rSlab = s.halfU * Math.abs(dot2(s.u, a)) + s.halfV * Math.abs(dot2(s.v, a));
    const rBox = hx * Math.abs(a[0]) + hz * Math.abs(a[1]);
    return Math.abs(dot2(d, a)) >= rSlab + rBox - 1e-6;
  });
}

/** The figure's body as two slabs across the screen (legs, then torso and arms), each `depth` thick toward the camera. */
function bodyOf(at: Vec3, h: number, forward: Vec3): Slab[] {
  const { right, depth } = groundAxes(forward);
  const base = { centre: [at[0], at[2]] as [number, number], u: right, v: depth, halfV: (h * FIGURE_EXTENT.depth) / 2 };
  const waist = at[1] + h * FIGURE_EXTENT.waist;
  return [
    { ...base, halfU: h * FIGURE_EXTENT.legHalfWidth, y0: at[1], y1: waist },
    { ...base, halfU: h * FIGURE_EXTENT.halfWidth, y0: waist, y1: at[1] + h * FIGURE_EXTENT.height },
  ];
}

export const bodyClears = (at: Vec3, h: number, forward: Vec3, obstacles: readonly Box3[]) => bodyOf(at, h, forward).every((s) => obstacles.every((b) => apart(s, b)));

const STEPS = 48;

/** The tallest body up to `wanted` that stands at `at` without entering any obstacle, scanned downward because clearance is not monotonic in height. */
export function clearHeight(at: Vec3, wanted: number, forward: Vec3, obstacles: readonly Box3[], floor: number): number {
  for (let i = 0; i < STEPS; i++) {
    const h = wanted * (1 - i / STEPS);
    if (h < floor) break;
    if (bodyClears(at, h, forward, obstacles)) return h;
  }
  return Math.min(floor, wanted);
}
