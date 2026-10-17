import type { Rect } from "../architecture/layout.ts";
import { shuffle, type Rng } from "../../../shared/rng.ts";
import { KIND_DIMENSIONS, LAYOUT_RULES } from "./dimensions.ts";
import { bboxArea, bboxOf, candidatesAround, facingSlot, overlaps, sharedEdge, SIDES, translate, type Candidate, type Side } from "./place.ts";
import { GrammarError, type SpaceEdge, type SpaceGraph, type SpaceNode } from "./types.ts";

export type PlacedSpace = { node: SpaceNode; rect: Rect; level: number; y0: number; y1: number };

export type GraphLayout = { spaces: PlacedSpace[]; bounds: Rect; fallbacks: string[] };

type Local = { w: number; d: number; rects: Map<string, Rect> };

type Solver = { graph: SpaceGraph; rng: Rng; log: string[]; sideOf: Map<string, Side> };

const related = (e: SpaceEdge, id: string): string | undefined => (e.relation === "connects" || e.relation === "faces" ? (e.from === id ? e.to : e.to === id ? e.from : undefined) : undefined);

const belowOf = (s: Solver, id: string): string | undefined => s.graph.edges.find((e) => e.relation === "above" && e.from === id)?.to;

function bfsOrder(kids: SpaceNode[], s: Solver): SpaceNode[] {
  const ids = new Set(kids.map((k) => k.id));
  const nbrs = (id: string) => s.graph.edges.map((e) => related(e, id)).filter((o): o is string => !!o && ids.has(o));
  const hub = [...kids].sort((a, b) => nbrs(b.id).length - nbrs(a.id).length)[0];
  const order: SpaceNode[] = [];
  const seen = new Set<string>();
  const queue = [hub.id];
  while (order.length < kids.length) {
    const id = queue.shift() ?? kids.find((k) => !seen.has(k.id))!.id;
    if (seen.has(id)) continue;
    seen.add(id);
    order.push(kids.find((k) => k.id === id)!);
    queue.push(...nbrs(id).filter((o) => !seen.has(o)));
  }
  return order;
}

function candidatesFor(kid: SpaceNode, size: [number, number], placed: Map<string, Rect>, s: Solver): Candidate[] {
  const links = s.graph.edges.filter((e) => related(e, kid.id) && placed.has(related(e, kid.id)!));
  const anchors = links.length ? links.map((e) => ({ id: related(e, kid.id)!, faces: e.relation === "faces" })) : [...placed.keys()].map((id) => ({ id, faces: false }));
  const sides = shuffle(SIDES, s.rng);
  const [a, b] = size;
  const gap = links.length ? 0 : LAYOUT_RULES.street;
  return anchors.flatMap(({ id, faces }) => {
    const p = placed.get(id)!;
    const r = { x0: p.x0 - gap, z0: p.z0 - gap, x1: p.x1 + gap, z1: p.z1 + gap };
    if (faces) return sides.map((side) => facingSlot(id, r, Math.min(a, b), side));
    const anchorNode = s.graph.nodes.find((n) => n.id === id)!;
    const allowed = anchorNode.kind === "bridge" ? [s.sideOf.get(id)!] : sides;
    return allowed.flatMap((side) => {
      const along = side === "north" || side === "south";
      const orient: [number, number][] = kid.kind === "bridge" ? [along ? [Math.min(a, b), Math.max(a, b)] : [Math.max(a, b), Math.min(a, b)]] : a === b ? [[a, b]] : [[a, b], [b, a]];
      return orient.flatMap(([w, d]) => candidatesAround(id, r, w, d, [side]));
    });
  });
}

function placeOne(kid: SpaceNode, size: [number, number], placed: Map<string, Rect>, s: Solver): Rect {
  const peers = new Set(s.graph.edges.map((e) => related(e, kid.id)).filter((o): o is string => !!o));
  const all = [...placed.values()];
  let best: { c: Candidate; adj: number; strangers: number; area: number } | undefined;
  for (const c of candidatesFor(kid, size, placed, s)) {
    if (all.some((r) => overlaps(r, c.rect))) continue;
    const adj = [...placed].filter(([id, r]) => peers.has(id) && sharedEdge(r, c.rect) >= LAYOUT_RULES.minShared - 1e-6).length;
    const strangers = [...placed].filter(([id, r]) => !peers.has(id) && sharedEdge(r, c.rect) > 1e-6).length;
    const area = bboxArea([...all, c.rect]);
    const better = !best || adj > best.adj || (adj === best.adj && (strangers < best.strangers || (strangers === best.strangers && area < best.area - 1e-6)));
    if (better) best = { c, adj, strangers, area };
  }
  if (best) {
    s.sideOf.set(kid.id, best.c.side);
    return best.c.rect;
  }
  const box = bboxOf(all);
  s.log.push(`${kid.id}: sin hueco adyacente libre; colocado aparte al este del conjunto`);
  return { x0: box.x1 + LAYOUT_RULES.precinctMargin, x1: box.x1 + LAYOUT_RULES.precinctMargin + size[0], z0: box.z0, z1: box.z0 + size[1] };
}

function solve(c: SpaceNode, s: Solver): Local {
  const kids = s.graph.nodes.filter((n) => n.parent === c.id);
  const ground = kids.filter((k) => !belowOf(s, k.id));
  if (ground.length === 0) return { w: c.footprint[0], d: c.footprint[1], rects: new Map() };
  const sub = new Map(ground.filter((k) => s.graph.nodes.some((n) => n.parent === k.id)).map((k) => [k.id, solve(k, s)]));
  const placed = new Map<string, Rect>();
  for (const kid of bfsOrder(ground, s)) {
    const inner = sub.get(kid.id);
    const size: [number, number] = inner ? [inner.w, inner.d] : kid.footprint;
    placed.set(kid.id, placed.size === 0 ? { x0: 0, z0: 0, x1: size[0], z1: size[1] } : placeOne(kid, size, placed, s));
  }
  for (const kid of kids) {
    const below = belowOf(s, kid.id);
    if (!below) continue;
    if (!placed.has(below)) throw new GrammarError("dangling-edge", `${kid.id} above ${below}, which is not placed`);
    placed.set(kid.id, placed.get(below)!);
  }
  const box = bboxOf([...placed.values()]);
  const margin = c.kind === "courtyard" ? LAYOUT_RULES.courtyardMargin : LAYOUT_RULES.precinctMargin;
  const w = Math.max(c.kind === "courtyard" ? c.footprint[0] : 0, box.x1 - box.x0 + 2 * margin);
  const d = Math.max(c.kind === "courtyard" ? c.footprint[1] : 0, box.z1 - box.z0 + 2 * margin);
  const dx = (w - (box.x1 - box.x0)) / 2 - box.x0;
  const dz = (d - (box.z1 - box.z0)) / 2 - box.z0;
  const rects = new Map<string, Rect>();
  for (const [id, r] of placed) {
    const own = translate(r, dx, dz);
    rects.set(id, own);
    for (const [deep, dr] of sub.get(id)?.rects ?? []) rects.set(deep, translate(dr, own.x0, own.z0));
  }
  return { w, d, rects };
}

export function solveLayout(graph: SpaceGraph, rng: Rng): GraphLayout {
  const root = graph.nodes.find((n) => !n.parent);
  if (!root) throw new GrammarError("unknown-target", "the graph has no root space");
  const s: Solver = { graph, rng, log: [], sideOf: new Map() };
  const local = solve(root, s);
  const rects = new Map(local.rects);
  rects.set(root.id, { x0: 0, z0: 0, x1: local.w, z1: local.d });
  const shifted = new Map([...rects].map(([id, r]) => [id, translate(r, -local.w / 2, -local.d / 2)]));
  const byId = new Map(graph.nodes.map((n) => [n.id, n]));
  const spaces = new Map<string, PlacedSpace>();
  const placeY = (n: SpaceNode): PlacedSpace => {
    const known = spaces.get(n.id);
    if (known) return known;
    const below = belowOf(s, n.id);
    const parent = n.parent ? placeY(byId.get(n.parent)!) : undefined;
    const base = below ? placeY(byId.get(below)!).y1 : parent ? parent.y1 : 0;
    const placed = { node: n, rect: shifted.get(n.id)!, level: n.level, y0: base, y1: base + KIND_DIMENSIONS[n.kind].height };
    spaces.set(n.id, placed);
    return placed;
  };
  graph.nodes.forEach(placeY);
  return { spaces: graph.nodes.map((n) => spaces.get(n.id)!), bounds: shifted.get(root.id)!, fallbacks: s.log };
}
