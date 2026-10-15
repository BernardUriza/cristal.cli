import { boundsOf, type Box3, type Vec3 } from "../math/vec3.ts";
import type { Vec2 } from "../shapes.ts";
import type { Rect } from "./layout.ts";
import { openingSpan, wallLength, type Opening, type Plan, type Space, type Wall } from "./plan.ts";

export type Face = { points: Vec3[]; normal: Vec3 };

export type SolidKind = "wall" | "lintel" | "sill" | "floor" | "roof" | "tower-roof";

export type SolidTag = { kind: SolidKind; space?: string; wall?: string; opening?: string };

export type Solid = { id: string; tag: SolidTag; faces: Face[] };

export type Building = { plan: Plan; solids: Solid[]; bounds: Box3 };

function quad(a: Vec3, b: Vec3, c: Vec3, d: Vec3, normal: Vec3): Face {
  return { points: [a, b, c, d], normal };
}

/** Right prism over a plan polygon (x, z) given counter-clockwise when seen from above (+Y). */
export function prism(id: string, tag: SolidTag, footprint: readonly Vec2[], y0: number, y1: number): Solid {
  const n = footprint.length;
  const bottom: Vec3[] = footprint.map((p) => [p[0], y0, p[1]]);
  const top: Vec3[] = footprint.map((p) => [p[0], y1, p[1]]);
  const faces: Face[] = [];
  for (let i = 0; i < n; i++) {
    const j = (i + 1) % n;
    const dx = footprint[j][0] - footprint[i][0];
    const dz = footprint[j][1] - footprint[i][1];
    const len = Math.hypot(dx, dz) || 1;
    faces.push(quad(bottom[i], bottom[j], top[j], top[i], [-dz / len, 0, dx / len]));
  }
  faces.push({ points: top, normal: [0, 1, 0] });
  faces.push({ points: [...bottom].reverse(), normal: [0, -1, 0] });
  return { id, tag, faces };
}

function rectFootprint(r: Rect): Vec2[] {
  return [[r.x0, r.z0], [r.x0, r.z1], [r.x1, r.z1], [r.x1, r.z0]];
}

export function box(id: string, tag: SolidTag, r: Rect, y0: number, y1: number): Solid {
  return prism(id, tag, rectFootprint(r), y0, y1);
}

export function pyramid(id: string, tag: SolidTag, r: Rect, y0: number, apexY: number): Solid {
  const base = rectFootprint(r).map((p): Vec3 => [p[0], y0, p[1]]);
  const apex: Vec3 = [(r.x0 + r.x1) / 2, apexY, (r.z0 + r.z1) / 2];
  const faces: Face[] = [];
  for (let i = 0; i < 4; i++) {
    const a = base[i];
    const b = base[(i + 1) % 4];
    const e1: Vec3 = [b[0] - a[0], b[1] - a[1], b[2] - a[2]];
    const e2: Vec3 = [apex[0] - a[0], apex[1] - a[1], apex[2] - a[2]];
    const n: Vec3 = [e1[1] * e2[2] - e1[2] * e2[1], e1[2] * e2[0] - e1[0] * e2[2], e1[0] * e2[1] - e1[1] * e2[0]];
    const len = Math.hypot(...n) || 1;
    faces.push({ points: [a, b, apex], normal: [n[0] / len, n[1] / len, n[2] / len] });
  }
  faces.push({ points: [...base].reverse(), normal: [0, -1, 0] });
  return { id, tag, faces };
}

/** End pieces grow by half the thickness so corners and T-junctions close instead of leaving a notch. */
function wallSlab(wall: Wall, from: number, to: number): Vec2[] {
  const L = wallLength(wall);
  if (from <= 1e-9) from = -wall.thickness / 2;
  if (to >= L - 1e-9) to = L + wall.thickness / 2;
  const dx = (wall.b[0] - wall.a[0]) / L;
  const dz = (wall.b[1] - wall.a[1]) / L;
  const px = (-dz * wall.thickness) / 2;
  const pz = (dx * wall.thickness) / 2;
  const p = (t: number, side: 1 | -1): Vec2 => [wall.a[0] + dx * t + side * px, wall.a[1] + dz * t + side * pz];
  const quadPts: Vec2[] = [p(from, -1), p(to, -1), p(to, 1), p(from, 1)];
  const area = quadPts.reduce((acc, cur, i) => {
    const nxt = quadPts[(i + 1) % 4];
    return acc + (cur[0] * nxt[1] - nxt[0] * cur[1]);
  }, 0);
  return area < 0 ? quadPts : quadPts.reverse();
}

function wallSolids(wall: Wall, y0: number): Solid[] {
  const L = wallLength(wall);
  const solids: Solid[] = [];
  const spans = wall.openings.map((o) => ({ o, ...openingSpan(wall, o) })).sort((p, q) => p.from - q.from);
  let cursor = 0;
  let piece = 0;
  const push = (kind: SolidKind, from: number, to: number, lo: number, hi: number, opening?: Opening) => {
    if (to - from <= 1e-9 || hi - lo <= 1e-9) return;
    solids.push(prism(`${wall.id}#${piece++}`, { kind, wall: wall.id, opening: opening?.id }, wallSlab(wall, from, to), lo, hi));
  };
  for (const s of spans) {
    push("wall", cursor, Math.max(cursor, s.from), y0, wall.height);
    if (s.o.kind !== "open") {
      push("sill", s.from, s.to, y0, s.o.sill, s.o);
      push("lintel", s.from, s.to, s.o.sill + s.o.height, wall.height, s.o);
    }
    cursor = Math.max(cursor, s.to);
  }
  push("wall", cursor, L, y0, wall.height);
  return solids;
}

function grow(r: Rect, by: number): Rect {
  return { x0: r.x0 - by, z0: r.z0 - by, x1: r.x1 + by, z1: r.z1 + by };
}

type SideKey = "x0" | "x1" | "z0" | "z1";

function wallsOnSide(plan: Plan, space: Space, side: SideKey): Wall[] {
  const axis = side[0] === "x" ? 0 : 1;
  const line = space.rect[side];
  return plan.walls.filter((w) => (w.left === space.id || w.right === space.id) && Math.abs(w.a[axis] - line) < 1e-9 && Math.abs(w.b[axis] - line) < 1e-9);
}

/** Roof slab reaches the outer face of exterior walls, the centre of interior walls, and stops at a taller tower's inner face. */
function roofCover(plan: Plan, space: Space): Rect {
  const byId = new Map(plan.spaces.map((s) => [s.id, s]));
  const extension = (side: SideKey): number => {
    const walls = wallsOnSide(plan, space, side);
    if (walls.length === 0) return 0;
    return Math.min(
      ...walls.map((w) => {
        const other = w.left === space.id ? w.right : w.left;
        const neighbour = byId.get(other);
        if (!neighbour) return w.thickness / 2;
        return neighbour.height > space.height ? -w.thickness / 2 : w.thickness / 2;
      }),
    );
  };
  const r = space.rect;
  return { x0: r.x0 - extension("x0"), x1: r.x1 + extension("x1"), z0: r.z0 - extension("z0"), z1: r.z1 + extension("z1") };
}

export function buildMass(plan: Plan): Building {
  const { layout } = plan;
  const solids: Solid[] = [];
  const slabHalf = layout.walls.exterior / 2;
  solids.push(box("floor", { kind: "floor" }, grow(plan.bounds, slabHalf), -layout.heights.roofSlab, 0));
  for (const wall of plan.walls) solids.push(...wallSolids(wall, 0));
  for (const space of plan.spaces) {
    if (space.kind === "courtyard" || space.kind === "exterior") continue;
    const cover = roofCover(plan, space);
    solids.push(box(`roof:${space.id}`, { kind: "roof", space: space.id }, cover, space.height, space.height + layout.heights.roofSlab));
    if (space.kind === "tower") {
      const top = space.height + layout.heights.roofSlab;
      solids.push(pyramid(`tower-roof:${space.id}`, { kind: "tower-roof", space: space.id }, cover, top, top + layout.heights.towerRoof));
    }
  }
  const bounds = boundsOf(solids.flatMap((s) => s.faces.flatMap((f) => f.points)));
  return { plan, solids, bounds };
}

/** World-space rectangle of an opening on its wall's centre plane: the single source every drawing projects. */
export function openingRect(plan: Plan, opening: Opening): Vec3[] {
  const wall = plan.walls.find((w) => w.id === opening.wallId)!;
  const { start, end } = openingSpan(wall, opening);
  const lo = opening.sill;
  const hi = opening.sill + opening.height;
  return [[start[0], lo, start[1]], [end[0], lo, end[1]], [end[0], hi, end[1]], [start[0], hi, start[1]]];
}
