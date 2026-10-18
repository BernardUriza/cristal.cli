import { boxAnchors, quad, type Part, type StructuralRole } from "../motifs/figures/parts.ts";
import type { Vec2 } from "../shapes.ts";

/** A child part laid in its parent's local frame, with its own frame so a nested rewrite inherits the parent's orientation. */
export function localPart(id: string, role: StructuralRole, geometryId: string, x0: number, y0: number, x1: number, y1: number, mask?: Vec2[], anchors: Record<string, Vec2> = {}): Part {
  const box = quad(x0, y0, x1, y1);
  return { id, role, geometryId, anchors: { ...boxAnchors(box), ...anchors }, mask: mask ?? box, frame: { o: [x0, y0], u: [x1 - x0, 0], v: [0, y1 - y0], w: x1 - x0, h: y1 - y0 }, children: [] };
}

export function archedTop(x0: number, y0: number, x1: number, y1: number, steps = 6): Vec2[] {
  const r = Math.min((x1 - x0) / 2, (y1 - y0) / 2);
  const cx = (x0 + x1) / 2;
  const arc = Array.from({ length: steps + 1 }, (_, i): Vec2 => [cx - r * Math.cos((i / steps) * Math.PI), y0 + r - r * Math.sin((i / steps) * Math.PI)]);
  return [[x0, y1], ...arc, [x1, y1]];
}
