import { rewriteOf, rootOf, type SemanticRoot } from "../../domain/semantic.ts";
import type { DisplayList, Shape, Style, Transform, Vec2 } from "../../domain/shapes.ts";

export type Leaf = { points: Vec2[]; closed: boolean; style: Style; root?: SemanticRoot; rewrites?: readonly string[] };

function ellipsePoints(cx: number, cy: number, rx: number, ry: number, segments: number): Vec2[] {
  return Array.from({ length: segments }, (_, i) => {
    const a = (i / segments) * Math.PI * 2;
    return [cx + rx * Math.cos(a), cy + ry * Math.sin(a)] as Vec2;
  });
}

function applyTransform(p: Vec2, transform: Transform): Vec2 {
  let [x, y] = p;
  for (let i = transform.length - 1; i >= 0; i--) {
    const op = transform[i];
    if ("rotate" in op) {
      const a = (op.rotate * Math.PI) / 180;
      [x, y] = [x * Math.cos(a) - y * Math.sin(a), x * Math.sin(a) + y * Math.cos(a)];
    } else {
      x += op.translate[0];
      y += op.translate[1];
    }
  }
  return [x, y];
}

function outline(shape: Exclude<Shape, { kind: "group" }>, segments: number): { points: Vec2[]; closed: boolean } {
  switch (shape.kind) {
    case "polygon": return { points: shape.points, closed: true };
    case "polyline": return { points: shape.points, closed: false };
    case "line": return { points: [shape.a, shape.b], closed: false };
    case "rect": return { points: [[shape.x, shape.y], [shape.x + shape.w, shape.y], [shape.x + shape.w, shape.y + shape.h], [shape.x, shape.y + shape.h]], closed: true };
    case "circle": return { points: ellipsePoints(shape.cx, shape.cy, shape.r, shape.r, segments), closed: true };
    case "ellipse": return { points: ellipsePoints(shape.cx, shape.cy, shape.rx, shape.ry, segments), closed: true };
    case "path": return { points: shape.segments.flatMap((s) => (s.op === "Z" ? [] : [s.p])), closed: shape.segments.some((s) => s.op === "Z") };
  }
}

function isVisible(style: Style): boolean {
  if (style.opacity === 0) return false;
  const hasFill = style.fill !== undefined && style.fill !== "none";
  const hasStroke = style.stroke !== undefined && style.stroke !== "none" && (style.strokeWidth ?? 1) > 0;
  return hasFill || hasStroke;
}

/** Rewrite output groups met while flattening: their clip (the source's mask) in screen space, by output node. */
export type RewriteClips = Map<string, Vec2[] | null>;

export function flattenLeaves(list: DisplayList, segments: number, outer: Transform = [], inherited?: SemanticRoot, chain: readonly string[] = [], clips?: RewriteClips): Leaf[] {
  const leaves: Leaf[] = [];
  for (const shape of list) {
    const root = rootOf(shape) ?? inherited;
    if (shape.kind === "group") {
      const t = [...outer, ...shape.transform];
      const tag = rewriteOf(shape);
      if (tag !== undefined && clips && !clips.has(tag)) clips.set(tag, shape.clip ? shape.clip.map((p) => applyTransform(p, t)) : null);
      leaves.push(...flattenLeaves(shape.children, segments, t, root, tag === undefined ? chain : [...chain, tag], clips));
      continue;
    }
    if (!isVisible(shape.style)) continue;
    const { points, closed } = outline(shape, segments);
    if (points.length === 0) continue;
    leaves.push({ points: points.map((p) => applyTransform(p, outer)), closed, style: shape.style, ...(root ? { root } : {}), ...(chain.length ? { rewrites: chain } : {}) });
  }
  return leaves;
}

export function leafBox(leaf: Leaf): { x0: number; y0: number; x1: number; y1: number } {
  let x0 = Infinity, y0 = Infinity, x1 = -Infinity, y1 = -Infinity;
  for (const [x, y] of leaf.points) {
    x0 = Math.min(x0, x); y0 = Math.min(y0, y); x1 = Math.max(x1, x); y1 = Math.max(y1, y);
  }
  return { x0, y0, x1, y1 };
}

