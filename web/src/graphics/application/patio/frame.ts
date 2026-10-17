import { mapShapePoints } from "../../domain/mapPoints.ts";
import { add, dot, normalize, scale, sub, type Vec3 } from "../../domain/math/vec3.ts";
import type { Shape, Vec2 } from "../../domain/shapes.ts";
import type { Projector } from "../projector.ts";

/** Local 2D frame on a planar face, in metres: origin at the bottom-left seen from the camera, u along the base, v up the face. */
export type LocalFrame = { origin: Vec3; u: Vec3; v: Vec3; width: number; height: number };

export function frameOf(points: readonly Vec3[], normal: Vec3, projector: Projector): LocalFrame {
  const byHeight = [...points].sort((a, b) => a[1] - b[1]);
  let a = byHeight[0];
  let b = byHeight[1];
  if (projector.toScreen(a)[0] > projector.toScreen(b)[0]) [a, b] = [b, a];
  const u = normalize(sub(b, a));
  let v: Vec3 = [0, 1, 0];
  if (Math.abs(normal[1]) > 1e-9) {
    const apex = points.find((p) => p !== a && p !== b) ?? a;
    const w = sub(apex, a);
    v = normalize(sub(w, scale(u, dot(w, u))));
  }
  const height = Math.max(...points.map((p) => dot(sub(p, a), v)));
  return { origin: a, u, v, width: Math.hypot(...sub(b, a)), height };
}

/** 2D ornament coordinates are y-down from the top edge of the face, so motifs drawn for the screen stand upright on the wall. */
export function toWorld(frame: LocalFrame, x: number, y: number): Vec3 {
  return add(add(frame.origin, scale(frame.u, x)), scale(frame.v, frame.height - y));
}

export function projectedSize(frame: LocalFrame, projector: Projector): { w: number; h: number } {
  const o = projector.toScreen(frame.origin);
  const px = projector.toScreen(add(frame.origin, scale(frame.u, frame.width)));
  const py = projector.toScreen(add(frame.origin, scale(frame.v, frame.height)));
  return { w: Math.hypot(px[0] - o[0], px[1] - o[1]), h: Math.hypot(py[0] - o[0], py[1] - o[1]) };
}

export function subFrame(frame: LocalFrame, x: number, y: number, widthM: number, heightM: number, unitsWide: number, unitsHigh: number): LocalFrame {
  const s = Math.min(widthM / unitsWide, heightM / unitsHigh);
  return { origin: toWorld(frame, x, y + unitsHigh * s), u: scale(frame.u, s), v: scale(frame.v, s), width: unitsWide, height: unitsHigh };
}

export function mapShapes(shapes: readonly Shape[], frame: LocalFrame, projector: Projector, offset: Vec2 = [0, 0]): Shape[] {
  return mapShapePoints(shapes, (p) => projector.toScreen(toWorld(frame, p[0] + offset[0], p[1] + offset[1])));
}
