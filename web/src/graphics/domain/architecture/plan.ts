import type { Vec2 } from "../shapes.ts";
import { type CloisterLayout, type Rect, rectWidth, rectDepth } from "./layout.ts";
import { EXTERIOR, pairKey, type AccessKind, type Program, type SpaceKind, type SpaceSpec } from "./program.ts";

export type Space = SpaceSpec & { rect: Rect; floor: number; height: number };

export type Opening = {
  id: string;
  wallId: string;
  kind: AccessKind;
  between: [string, string];
  at: number;
  width: number;
  height: number;
  sill: number;
};

export type Wall = {
  id: string;
  a: Vec2;
  b: Vec2;
  thickness: number;
  height: number;
  left: string;
  right: string;
  openings: Opening[];
};

export type Plan = {
  programId: string;
  layout: CloisterLayout;
  bounds: Rect;
  spaces: Space[];
  walls: Wall[];
  openings: Opening[];
};

type Edge = { space: string; axis: "x" | "z"; line: number; lo: number; hi: number; outward: 1 | -1 };

type Interval = { lo: number; hi: number };

const EPS = 1e-6;

function heightFor(kind: SpaceKind, layout: CloisterLayout): number {
  switch (kind) {
    case "room": return layout.heights.room;
    case "gallery": return layout.heights.gallery;
    case "tower": return layout.heights.tower;
    case "vestibule": return layout.heights.vestibule;
    case "courtyard": return 0;
    case "exterior": return 0;
  }
}

function splitAlong(lo: number, hi: number, count: number): Interval[] {
  const step = (hi - lo) / count;
  return Array.from({ length: count }, (_, i) => ({ lo: lo + i * step, hi: lo + (i + 1) * step }));
}

export function layoutRects(layout: CloisterLayout): Record<string, Rect> {
  const W = layout.footprint.width;
  const D = layout.footprint.depth;
  const cw = layout.courtyard.width;
  const cd = layout.courtyard.depth;
  const g = layout.galleryWidth;
  const rX = (W - cw) / 2 - g;
  const rZ = (D - cd) / 2 - g;
  const rects: Record<string, Rect> = {};
  rects.patio = { x0: -cw / 2, z0: -cd / 2, x1: cw / 2, z1: cd / 2 };
  rects["gal-n"] = { x0: -cw / 2 - g, z0: -cd / 2 - g, x1: cw / 2 + g, z1: -cd / 2 };
  rects["gal-s"] = { x0: -cw / 2 - g, z0: cd / 2, x1: cw / 2 + g, z1: cd / 2 + g };
  rects["gal-e"] = { x0: cw / 2, z0: -cd / 2, x1: cw / 2 + g, z1: cd / 2 };
  rects["gal-w"] = { x0: -cw / 2 - g, z0: -cd / 2, x1: -cw / 2, z1: cd / 2 };
  rects["torre-ne"] = { x0: W / 2 - rX, z0: -D / 2, x1: W / 2, z1: -D / 2 + rZ };
  rects["torre-nw"] = { x0: -W / 2, z0: -D / 2, x1: -W / 2 + rX, z1: -D / 2 + rZ };
  rects["torre-se"] = { x0: W / 2 - rX, z0: D / 2 - rZ, x1: W / 2, z1: D / 2 };
  rects["torre-sw"] = { x0: -W / 2, z0: D / 2 - rZ, x1: -W / 2 + rX, z1: D / 2 };
  splitAlong(-W / 2 + rX, W / 2 - rX, layout.roomsPerSide.north).forEach((iv, i) => {
    rects[`sala-n${i + 1}`] = { x0: iv.lo, z0: -D / 2, x1: iv.hi, z1: -D / 2 + rZ };
  });
  const vw = layout.vestibuleWidth;
  const southLeft = Math.ceil(layout.roomsPerSide.south / 2);
  const southRight = layout.roomsPerSide.south - southLeft;
  let s = 0;
  splitAlong(-W / 2 + rX, -vw / 2, southLeft).forEach((iv) => {
    rects[`sala-s${++s}`] = { x0: iv.lo, z0: D / 2 - rZ, x1: iv.hi, z1: D / 2 };
  });
  rects.vestibulo = { x0: -vw / 2, z0: D / 2 - rZ, x1: vw / 2, z1: D / 2 };
  splitAlong(vw / 2, W / 2 - rX, southRight).forEach((iv) => {
    rects[`sala-s${++s}`] = { x0: iv.lo, z0: D / 2 - rZ, x1: iv.hi, z1: D / 2 };
  });
  splitAlong(-D / 2 + rZ, D / 2 - rZ, layout.roomsPerSide.east).forEach((iv, i) => {
    rects[`sala-e${i + 1}`] = { x0: W / 2 - rX, z0: iv.lo, x1: W / 2, z1: iv.hi };
  });
  splitAlong(-D / 2 + rZ, D / 2 - rZ, layout.roomsPerSide.west).forEach((iv, i) => {
    rects[`sala-w${i + 1}`] = { x0: -W / 2, z0: iv.lo, x1: -W / 2 + rX, z1: iv.hi };
  });
  return rects;
}

function edgesOf(space: Space): Edge[] {
  const r = space.rect;
  return [
    { space: space.id, axis: "z", line: r.z0, lo: r.x0, hi: r.x1, outward: -1 },
    { space: space.id, axis: "z", line: r.z1, lo: r.x0, hi: r.x1, outward: 1 },
    { space: space.id, axis: "x", line: r.x0, lo: r.z0, hi: r.z1, outward: -1 },
    { space: space.id, axis: "x", line: r.x1, lo: r.z0, hi: r.z1, outward: 1 },
  ];
}

function subtract(intervals: Interval[], cut: Interval): Interval[] {
  const out: Interval[] = [];
  for (const iv of intervals) {
    if (cut.hi <= iv.lo + EPS || cut.lo >= iv.hi - EPS) {
      out.push(iv);
      continue;
    }
    if (cut.lo > iv.lo + EPS) out.push({ lo: iv.lo, hi: cut.lo });
    if (cut.hi < iv.hi - EPS) out.push({ lo: cut.hi, hi: iv.hi });
  }
  return out;
}

function endpoints(edge: Edge, iv: Interval): [Vec2, Vec2] {
  return edge.axis === "z" ? [[iv.lo, edge.line], [iv.hi, edge.line]] : [[edge.line, iv.lo], [edge.line, iv.hi]];
}

function thicknessFor(a: SpaceKind, b: SpaceKind | "exterior", layout: CloisterLayout): number {
  if (b === "exterior") return layout.walls.exterior;
  const pair = [a, b];
  if (pair.includes("courtyard") && pair.includes("gallery")) return layout.walls.arcade;
  return layout.walls.interior;
}

function buildWalls(spaces: Space[], layout: CloisterLayout): Wall[] {
  const byId = new Map(spaces.map((s) => [s.id, s]));
  const walls: Wall[] = [];
  const seen = new Set<string>();
  const allEdges = spaces.flatMap(edgesOf);
  for (const edge of allEdges) {
    let free: Interval[] = [{ lo: edge.lo, hi: edge.hi }];
    for (const other of allEdges) {
      if (other.space === edge.space || other.axis !== edge.axis || Math.abs(other.line - edge.line) > EPS || other.outward === edge.outward) continue;
      const lo = Math.max(edge.lo, other.lo);
      const hi = Math.min(edge.hi, other.hi);
      if (hi - lo <= EPS) continue;
      free = subtract(free, { lo, hi });
      const key = `${pairKey(edge.space, other.space)}@${edge.axis}${edge.line.toFixed(4)}:${lo.toFixed(4)}-${hi.toFixed(4)}`;
      if (seen.has(key)) continue;
      seen.add(key);
      const [first, second] = edge.space < other.space ? [edge.space, other.space] : [other.space, edge.space];
      const sa = byId.get(first)!;
      const sb = byId.get(second)!;
      const [a, b] = endpoints(edge, { lo, hi });
      walls.push({ id: `w:${first}|${second}:${walls.length}`, a, b, thickness: thicknessFor(sa.kind, sb.kind, layout), height: Math.max(sa.height, sb.height), left: first, right: second, openings: [] });
    }
    const self = byId.get(edge.space)!;
    for (const iv of free) {
      const [a, b] = endpoints(edge, iv);
      walls.push({ id: `w:${edge.space}|${EXTERIOR}:${walls.length}`, a, b, thickness: thicknessFor(self.kind, "exterior", layout), height: self.height, left: edge.space, right: EXTERIOR, openings: [] });
    }
  }
  return walls;
}

export function wallLength(w: Wall): number {
  return Math.hypot(w.b[0] - w.a[0], w.b[1] - w.a[1]);
}

function wallsBetween(walls: Wall[], a: string, b: string): Wall[] {
  const key = pairKey(a, b);
  return walls.filter((w) => pairKey(w.left, w.right) === key).sort((p, q) => wallLength(q) - wallLength(p));
}

function makeOpening(wall: Wall, kind: AccessKind, between: [string, string], at: number, width: number, height: number, sill: number, index: number): Opening {
  const opening: Opening = { id: `o:${wall.id}:${index}`, wallId: wall.id, kind, between, at, width, height, sill };
  wall.openings.push(opening);
  return opening;
}

function placeOpenings(program: Program, walls: Wall[], layout: CloisterLayout): Opening[] {
  const openings: Opening[] = [];
  const requests = [...program.adjacencies, program.entrance];
  for (const adj of requests) {
    const candidates = wallsBetween(walls, adj.a, adj.b);
    if (candidates.length === 0) continue;
    const wall = candidates[0];
    const spec = layout.openings[adj.access];
    const override = layout.openingOverrides[pairKey(adj.a, adj.b)] ?? {};
    const between: [string, string] = [adj.a, adj.b];
    const L = wallLength(wall);
    if (adj.access === "open") {
      openings.push(makeOpening(wall, "open", between, 0.5, L, wall.height, 0, openings.length));
      continue;
    }
    if (adj.access === "arch") {
      const archW = override.width ?? spec.width;
      const bays = Math.max(1, Math.floor((L - layout.arcadePier) / (archW + layout.arcadePier)));
      const pitch = L / bays;
      for (let i = 0; i < bays; i++) {
        openings.push(makeOpening(wall, "arch", between, (i + 0.5) / bays, Math.min(archW, pitch - layout.arcadePier), override.height ?? spec.height, override.sill ?? spec.sill, openings.length));
      }
      continue;
    }
    openings.push(makeOpening(wall, "door", between, override.at ?? 0.5, override.width ?? spec.width, override.height ?? spec.height, override.sill ?? spec.sill, openings.length));
  }
  return openings;
}

export function buildPlan(program: Program, layout: CloisterLayout): Plan {
  const rects = layoutRects(layout);
  const spaces: Space[] = program.spaces
    .filter((s) => rects[s.id])
    .map((s) => ({ ...s, rect: rects[s.id], floor: 0, height: heightFor(s.kind, layout) }));
  const walls = buildWalls(spaces, layout);
  const openings = placeOpenings(program, walls, layout);
  const W = layout.footprint.width;
  const D = layout.footprint.depth;
  return { programId: program.id, layout, bounds: { x0: -W / 2, z0: -D / 2, x1: W / 2, z1: D / 2 }, spaces, walls, openings };
}

export function openingSpan(wall: Wall, o: Opening): { start: Vec2; end: Vec2; center: Vec2; from: number; to: number } {
  const L = wallLength(wall);
  const dx = (wall.b[0] - wall.a[0]) / L;
  const dz = (wall.b[1] - wall.a[1]) / L;
  const from = o.at * L - o.width / 2;
  const to = o.at * L + o.width / 2;
  const pt = (t: number): Vec2 => [wall.a[0] + dx * t, wall.a[1] + dz * t];
  return { start: pt(from), end: pt(to), center: pt(o.at * L), from, to };
}

export function spaceRectSize(space: Space): { width: number; depth: number } {
  return { width: rectWidth(space.rect), depth: rectDepth(space.rect) };
}
