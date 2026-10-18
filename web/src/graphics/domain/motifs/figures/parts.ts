import { polygonBounds, type Bounds } from "../../bezier.ts";
import type { Vec2 } from "../../shapes.ts";
import type { RegionAnchors } from "./regions.ts";

export type StructuralRole = "support" | "span" | "enclosure" | "opening" | "crown" | "connector";

export type Frame2 = { o: Vec2; u: Vec2; v: Vec2; w: number; h: number };

export type Part = {
  id: string;
  role: StructuralRole;
  geometryId: string;
  anchors: Record<string, Vec2>;
  children: Part[];
  mask?: Vec2[];
  frame?: Frame2;
  regions?: RegionAnchors;
};

export type PartSpec = { id: string; role: StructuralRole; anchors?: Record<string, Vec2>; mask?: Vec2[]; children?: PartSpec[] };

export type PartMatch = { role?: StructuralRole; geometryId?: string };

export function oval(cx: number, cy: number, rx: number, ry: number, n = 16): Vec2[] {
  return Array.from({ length: n }, (_, i): Vec2 => [cx + rx * Math.cos((i / n) * Math.PI * 2), cy + ry * Math.sin((i / n) * Math.PI * 2)]);
}

export function quad(x0: number, y0: number, x1: number, y1: number): Vec2[] {
  return [[x0, y0], [x1, y0], [x1, y1], [x0, y1]];
}

export function boxAnchors(poly: readonly Vec2[]): Record<string, Vec2> {
  const b = polygonBounds(poly);
  const cx = (b.minX + b.maxX) / 2;
  const cy = (b.minY + b.maxY) / 2;
  return { top: [cx, b.minY], bottom: [cx, b.maxY], left: [b.minX, cy], right: [b.maxX, cy], center: [cx, cy] };
}

export function placePart(spec: PartSpec, at: (p: Vec2) => Vec2, prefix: string): Part {
  const mask = spec.mask?.map(at);
  const anchors: Record<string, Vec2> = mask ? boxAnchors(mask) : {};
  for (const [k, p] of Object.entries(spec.anchors ?? {})) anchors[k] = at(p);
  const id = `${prefix}.${spec.id}`;
  return { id, role: spec.role, geometryId: spec.id.replace(/\d+$/, ""), anchors, mask, children: (spec.children ?? []).map((c) => placePart(c, at, id)) };
}

export function partBounds(p: Part): Bounds {
  return polygonBounds(p.mask ?? Object.values(p.anchors));
}

export function boundsFrame(b: Bounds): Frame2 {
  const w = Math.max(1e-6, b.maxX - b.minX);
  const h = Math.max(1e-6, b.maxY - b.minY);
  return { o: [b.minX, b.minY], u: [w, 0], v: [0, h], w, h };
}

export function frameOf(p: Part): Frame2 {
  return p.frame ?? boundsFrame(partBounds(p));
}

export function matchesPart(p: Part, m: PartMatch): boolean {
  return (m.role === undefined || p.role === m.role) && (m.geometryId === undefined || p.geometryId === m.geometryId);
}

export function walkParts(root: Part, visit: (p: Part, depth: number) => void, depth = 0): void {
  visit(root, depth);
  for (const c of root.children) walkParts(c, visit, depth + 1);
}

export function renamePart(p: Part, id: string): Part {
  const rename = (q: Part): Part => ({ ...q, id: id + q.id.slice(p.id.length), children: q.children.map(rename) });
  return rename(p);
}
