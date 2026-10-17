import { box, type Face, type Solid, type SolidTag } from "../architecture/mass.ts";
import type { Rect } from "../architecture/layout.ts";
import { cross, normalize, sub, type Vec3 } from "../math/vec3.ts";

function faceOf(points: Vec3[]): Face {
  return { points, normal: normalize(cross(sub(points[1], points[0]), sub(points[2], points[0]))) };
}

export function gable(id: string, tag: SolidTag, r: Rect, y0: number, rise: number): Solid {
  const alongX = r.x1 - r.x0 >= r.z1 - r.z0;
  const top = y0 + rise;
  const mz = (r.z0 + r.z1) / 2;
  const mx = (r.x0 + r.x1) / 2;
  const a: Vec3 = [r.x0, y0, r.z0];
  const b: Vec3 = [r.x1, y0, r.z0];
  const c: Vec3 = [r.x1, y0, r.z1];
  const d: Vec3 = [r.x0, y0, r.z1];
  const faces: Face[] = alongX
    ? [
        faceOf([a, [r.x0, top, mz], [r.x1, top, mz], b]),
        faceOf([c, [r.x1, top, mz], [r.x0, top, mz], d]),
        faceOf([d, [r.x0, top, mz], a]),
        faceOf([b, [r.x1, top, mz], c]),
      ]
    : [
        faceOf([d, [mx, top, r.z1], [mx, top, r.z0], a]),
        faceOf([b, [mx, top, r.z0], [mx, top, r.z1], c]),
        faceOf([a, [mx, top, r.z0], b]),
        faceOf([c, [mx, top, r.z1], d]),
      ];
  faces.push({ points: [a, b, c, d], normal: [0, -1, 0] });
  return { id, tag, faces };
}

export function steppedDome(id: string, tag: SolidTag, r: Rect, y0: number, steps: number, stepHeight: number): Solid[] {
  const out: Solid[] = [];
  for (let k = 0; k < steps; k++) {
    const inset = ((k + 1) * Math.min(r.x1 - r.x0, r.z1 - r.z0)) / (2 * (steps + 1.5));
    const rk: Rect = { x0: r.x0 + inset, x1: r.x1 - inset, z0: r.z0 + inset, z1: r.z1 - inset };
    out.push(box(`${id}#${k}`, tag, rk, y0 + k * stepHeight, y0 + (k + 1) * stepHeight));
  }
  return out;
}
