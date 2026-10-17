import type { Rect } from "../architecture/layout.ts";
import { LAYOUT_RULES } from "./dimensions.ts";

export type Side = "north" | "south" | "west" | "east";

export const SIDES: readonly Side[] = ["north", "east", "south", "west"];

export type Candidate = { rect: Rect; anchor: string; side: Side };

const EPS = 1e-6;

export function overlaps(a: Rect, b: Rect): boolean {
  return Math.min(a.x1, b.x1) - Math.max(a.x0, b.x0) > EPS && Math.min(a.z1, b.z1) - Math.max(a.z0, b.z0) > EPS;
}

export function sharedEdge(a: Rect, b: Rect): number {
  const alongX = Math.min(a.x1, b.x1) - Math.max(a.x0, b.x0);
  const alongZ = Math.min(a.z1, b.z1) - Math.max(a.z0, b.z0);
  if (Math.abs(a.z1 - b.z0) < EPS || Math.abs(b.z1 - a.z0) < EPS) return Math.max(0, alongX);
  if (Math.abs(a.x1 - b.x0) < EPS || Math.abs(b.x1 - a.x0) < EPS) return Math.max(0, alongZ);
  return 0;
}

function slides(lo: number, hi: number, size: number): number[] {
  const min = LAYOUT_RULES.minShared;
  const first = lo - size + Math.min(min, size);
  const last = hi - Math.min(min, size);
  const out = new Set<number>([lo, hi - size, (lo + hi - size) / 2]);
  for (let t = first; t <= last + EPS; t += LAYOUT_RULES.slideStep) out.add(Math.round(t * 100) / 100);
  return [...out].filter((t) => t >= first - EPS && t <= last + EPS);
}

export function candidatesAround(anchorId: string, a: Rect, w: number, d: number, sides: readonly Side[]): Candidate[] {
  const out: Candidate[] = [];
  for (const side of sides) {
    if (side === "north" || side === "south") {
      const z0 = side === "north" ? a.z0 - d : a.z1;
      for (const x0 of slides(a.x0, a.x1, w)) out.push({ anchor: anchorId, side, rect: { x0, x1: x0 + w, z0, z1: z0 + d } });
    } else {
      const x0 = side === "west" ? a.x0 - w : a.x1;
      for (const z0 of slides(a.z0, a.z1, d)) out.push({ anchor: anchorId, side, rect: { x0, x1: x0 + w, z0, z1: z0 + d } });
    }
  }
  return out;
}

export function facingSlot(anchorId: string, a: Rect, depth: number, side: Side): Candidate {
  const rect: Rect =
    side === "north" ? { x0: a.x0, x1: a.x1, z0: a.z0 - depth, z1: a.z0 }
    : side === "south" ? { x0: a.x0, x1: a.x1, z0: a.z1, z1: a.z1 + depth }
    : side === "west" ? { x0: a.x0 - depth, x1: a.x0, z0: a.z0, z1: a.z1 }
    : { x0: a.x1, x1: a.x1 + depth, z0: a.z0, z1: a.z1 };
  return { anchor: anchorId, side, rect };
}

export function bboxOf(rects: readonly Rect[]): Rect {
  return {
    x0: Math.min(...rects.map((r) => r.x0)),
    z0: Math.min(...rects.map((r) => r.z0)),
    x1: Math.max(...rects.map((r) => r.x1)),
    z1: Math.max(...rects.map((r) => r.z1)),
  };
}

export function translate(r: Rect, dx: number, dz: number): Rect {
  return { x0: r.x0 + dx, x1: r.x1 + dx, z0: r.z0 + dz, z1: r.z1 + dz };
}

export function bboxArea(rects: readonly Rect[]): number {
  const b = bboxOf(rects);
  return (b.x1 - b.x0) * (b.z1 - b.z0);
}
