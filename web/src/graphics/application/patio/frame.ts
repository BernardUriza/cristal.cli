import { regularPolygon } from "../../domain/geometry.ts";
import { add, dot, normalize, scale, sub, type Vec3 } from "../../domain/math/vec3.ts";
import { line, polygon, polyline, type Shape, type Vec2 } from "../../domain/shapes.ts";
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
  const at = (p: Vec2): Vec2 => projector.toScreen(toWorld(frame, p[0] + offset[0], p[1] + offset[1]));
  const out: Shape[] = [];
  for (const s of shapes) {
    switch (s.kind) {
      case "polygon": out.push(polygon(s.points.map(at), s.style)); break;
      case "polyline": out.push(polyline(s.points.map(at), s.style)); break;
      case "line": out.push(line(at(s.a), at(s.b), s.style)); break;
      case "rect": out.push(polygon([at([s.x, s.y]), at([s.x + s.w, s.y]), at([s.x + s.w, s.y + s.h]), at([s.x, s.y + s.h])], s.style)); break;
      case "circle": out.push(polygon(regularPolygon(s.cx, s.cy, s.r, 12).map(at), s.style)); break;
      case "ellipse": out.push(polygon(regularPolygon(s.cx, s.cy, 1, 16).map((p): Vec2 => at([s.cx + (p[0] - s.cx) * s.rx, s.cy + (p[1] - s.cy) * s.ry])), s.style)); break;
      case "path": out.push(polyline(s.segments.flatMap((seg) => ("p" in seg ? [at(seg.p)] : [])), s.style)); break;
      case "group": {
        const shift = s.transform.reduce<Vec2>((acc, op) => ("translate" in op ? [acc[0] + op.translate[0], acc[1] + op.translate[1]] : acc), [0, 0]);
        out.push(...mapShapes(s.children, frame, projector, [offset[0] + shift[0], offset[1] + shift[1]]));
      }
    }
  }
  return out;
}
