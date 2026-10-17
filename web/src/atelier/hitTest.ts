import type { Shape, Vec2 } from "../graphics/domain/shapes.ts";
import type { Stroke } from "./strokes.ts";

type Box = { x0: number; y0: number; x1: number; y1: number };

function boxOf(points: readonly Vec2[]): Box {
  let x0 = Infinity, y0 = Infinity, x1 = -Infinity, y1 = -Infinity;
  for (const [x, y] of points) {
    x0 = Math.min(x0, x); y0 = Math.min(y0, y); x1 = Math.max(x1, x); y1 = Math.max(y1, y);
  }
  return { x0, y0, x1, y1 };
}

export function shapeBox(shape: Shape): Box {
  switch (shape.kind) {
    case "polygon":
    case "polyline":
      return boxOf(shape.points);
    case "circle":
      return { x0: shape.cx - shape.r, y0: shape.cy - shape.r, x1: shape.cx + shape.r, y1: shape.cy + shape.r };
    case "ellipse":
      return { x0: shape.cx - shape.rx, y0: shape.cy - shape.ry, x1: shape.cx + shape.rx, y1: shape.cy + shape.ry };
    case "line":
      return boxOf([shape.a, shape.b]);
    case "rect":
      return { x0: shape.x, y0: shape.y, x1: shape.x + shape.w, y1: shape.y + shape.h };
    case "path":
      return boxOf(shape.segments.flatMap((s) => (s.op === "Z" ? [] : [s.p])));
    case "group": {
      const boxes = shape.children.map(shapeBox);
      const shift = shape.transform.reduce<Vec2>((acc, op) => ("translate" in op ? [acc[0] + op.translate[0], acc[1] + op.translate[1]] : acc), [0, 0]);
      return {
        x0: Math.min(...boxes.map((b) => b.x0)) + shift[0],
        y0: Math.min(...boxes.map((b) => b.y0)) + shift[1],
        x1: Math.max(...boxes.map((b) => b.x1)) + shift[0],
        y1: Math.max(...boxes.map((b) => b.y1)) + shift[1],
      };
    }
  }
}

const MAX_HIT_AREA_RATIO = 0.35;

export function strokeAt(strokes: readonly Stroke[], point: Vec2, canvasArea: number, upTo = strokes.length): Stroke | null {
  for (let i = Math.min(upTo, strokes.length) - 1; i >= 0; i--) {
    const box = shapeBox(strokes[i].shape);
    const area = (box.x1 - box.x0) * (box.y1 - box.y0);
    if (area > canvasArea * MAX_HIT_AREA_RATIO) continue;
    if (point[0] >= box.x0 - 2 && point[0] <= box.x1 + 2 && point[1] >= box.y0 - 2 && point[1] <= box.y1 + 2) return strokes[i];
  }
  return null;
}
