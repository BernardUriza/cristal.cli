import { polygonBounds } from "../../../bezier.ts";
import type { Vec2 } from "../../../shapes.ts";
import { unitPolygon } from "./kinds.ts";
import { BODY_TUNING } from "./tuning.ts";
import type { PartKind, Socket } from "./types.ts";

/** Where a line x = v (axis 0) or y = v (axis 1) crosses the polygon: the lowest and highest crossing along the other axis. */
export function crossing(poly: readonly Vec2[], axis: 0 | 1, v: number): [number, number] | undefined {
  const o = 1 - axis;
  let lo = Infinity, hi = -Infinity;
  for (let i = 0; i < poly.length; i++) {
    const a = poly[i], b = poly[(i + 1) % poly.length];
    if (a[axis] === b[axis] || (a[axis] - v) * (b[axis] - v) > 0) continue;
    const w = a[o] + ((v - a[axis]) / (b[axis] - a[axis])) * (b[o] - a[o]);
    lo = Math.min(lo, w);
    hi = Math.max(hi, w);
  }
  return lo <= hi ? [lo, hi] : undefined;
}

export function inside(poly: readonly Vec2[], p: Vec2): boolean {
  let hit = false;
  for (let i = 0, j = poly.length - 1; i < poly.length; j = i++) {
    const [a, b] = [poly[i], poly[j]];
    if (a[1] > p[1] !== b[1] > p[1] && p[0] < ((b[0] - a[0]) * (p[1] - a[1])) / (b[1] - a[1]) + a[0]) hit = !hit;
  }
  return hit;
}

type Side = { line: 0 | 1; far: boolean; inward: Vec2 };

const SIDES: Record<string, Side> = {
  top: { line: 0, far: false, inward: [0, 1] },
  bottom: { line: 0, far: true, inward: [0, -1] },
  left: { line: 1, far: false, inward: [1, 0] },
  right: { line: 1, far: true, inward: [-1, 0] },
};

const clamp = (v: number, lo: number, hi: number) => (hi < lo ? (lo + hi) / 2 : Math.min(hi, Math.max(lo, v)));

function onSide(poly: readonly Vec2[], side: Side, offset: Vec2, sink: number): Vec2 {
  const b = polygonBounds(poly);
  const along = side.line === 0 ? (b.minX + b.maxX) / 2 + offset[0] : (b.minY + b.maxY) / 2 + offset[1];
  const span = crossing(poly, side.line, along);
  const edge = span ? span[side.far ? 1 : 0] : side.line === 0 ? (side.far ? b.maxY : b.minY) : side.far ? b.maxX : b.minX;
  const push = side.line === 0 ? offset[1] : offset[0];
  return side.line === 0 ? [along, edge + push + side.inward[1] * sink] : [edge + push + side.inward[0] * sink, along];
}

function within(poly: readonly Vec2[], p: Vec2, sink: number): Vec2 {
  if (inside(poly, p)) return p;
  const b = polygonBounds(poly);
  const y = clamp(p[1], b.minY + sink, b.maxY - sink);
  const row = crossing(poly, 1, y);
  return row ? [clamp(p[0], row[0] + sink, row[1] - sink), y] : p;
}

/** A parent socket on its real silhouette: a side socket where the line through its box anchor meets the outline, any other socket pulled inside it; both sink `sink`. `mirrored` reads the outline the flipped frame really draws. */
export function contactSocket(k: PartKind, s: Socket, offset: Vec2 = [0, 0], mirrored = false, sink: number = BODY_TUNING.contactSink): Socket {
  const raw = unitPolygon(k);
  const target: Vec2 = [s.at[0] + offset[0], s.at[1] + offset[1]];
  if (!raw.length) return { ...s, at: target };
  const poly = mirrored ? raw.map(([x, y]): Vec2 => [-x, y]) : raw;
  const side = SIDES[s.name];
  return { ...s, at: side ? onSide(poly, side, offset, sink) : within(poly, target, sink) };
}

/** A child's side joint on its own outline (box anchor otherwise). */
export function jointContact(k: PartKind, s: Socket): Socket {
  const side = SIDES[s.name];
  const poly = unitPolygon(k);
  return side && poly.length ? { ...s, at: onSide(poly, side, [0, 0], 0) } : s;
}
