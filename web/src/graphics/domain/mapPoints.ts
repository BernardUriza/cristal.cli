import { regularPolygon } from "./geometry.ts";
import { group, line, polygon, polyline, type Shape, type Transform, type Vec2 } from "./shapes.ts";

export type PointMap = (p: Vec2) => Vec2;

function underTransform(t: Transform, at: PointMap): PointMap {
  return (p) => {
    let q = p;
    for (let i = t.length - 1; i >= 0; i--) {
      const op = t[i];
      if ("translate" in op) q = [q[0] + op.translate[0], q[1] + op.translate[1]];
      else {
        const r = (op.rotate * Math.PI) / 180;
        q = [q[0] * Math.cos(r) - q[1] * Math.sin(r), q[0] * Math.sin(r) + q[1] * Math.cos(r)];
      }
    }
    return at(q);
  };
}

/** Maps every point of a display list through `at`; arcs become polylines, circles polygons, so any affine or projective map is exact at the vertices. */
export function mapShapePoints(shapes: readonly Shape[], at: PointMap): Shape[] {
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
        const inner = underTransform(s.transform, at);
        const children = mapShapePoints(s.children, inner);
        if (s.clip) out.push(group([], children, s.clip.map(inner)));
        else out.push(...children);
      }
    }
  }
  return out;
}
