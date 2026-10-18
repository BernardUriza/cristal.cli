import type { Rect } from "../architecture/layout.ts";
import { shuffle, type Rng } from "../../../shared/rng.ts";
import { alignCauseways, checkGates } from "./gates.ts";
import { CONTAINER_MARGIN, GAP_INSIDE, KIND_DIMENSIONS, LAYOUT_RULES, STREET_BY_STYLE } from "./dimensions.ts";
import { bboxArea, bboxOf, candidatesAround, facingSlot, overlaps, sharedEdge, SIDES, translate, type Candidate, type Side } from "./place.ts";
import { GrammarError, type Heading, type SpaceEdge, type SpaceGraph, type SpaceKind, type SpaceNode } from "./types.ts";

export type PlacedSpace = { node: SpaceNode; rect: Rect; level: number; y0: number; y1: number };

export type GraphLayout = { spaces: PlacedSpace[]; bounds: Rect; fallbacks: string[] };

type Local = { w: number; d: number; rects: Map<string, Rect> };

type Solver = { graph: SpaceGraph; rng: Rng; log: string[]; sideOf: Map<string, Side> };

const related = (e: SpaceEdge, id: string): string | undefined => (e.relation === "connects" || e.relation === "faces" ? (e.from === id ? e.to : e.to === id ? e.from : undefined) : undefined);

const SIDE_OF: Record<Heading, Side> = { 0: "east", 90: "south", 180: "west", 270: "north" };

function forcedSide(e: SpaceEdge, kid: SpaceNode, anchor: SpaceNode): Side | undefined {
  if (e.from === kid.id && kid.heading !== undefined) return SIDE_OF[kid.heading];
  if (e.from === anchor.id && anchor.heading !== undefined) return SIDE_OF[((anchor.heading + 180) % 360) as Heading];
  return undefined;
}

const SKELETON: readonly SpaceKind[] = ["street", "junction"];

const KEEPS_FOOTPRINT: readonly SpaceKind[] = ["courtyard", "plaza"];

const kindOf = (s: Solver, id: string | undefined): SpaceKind | undefined => (id ? s.graph.nodes.find((n) => n.id === id)?.kind : undefined);

const belowOf = (s: Solver, id: string): string | undefined => s.graph.edges.find((e) => e.relation === "above" && e.from === id)?.to;

/** Streets and junctions are laid before their frontage, oldest first, so a closing street finds both ends already placed. */
function nextSkeleton(queue: readonly string[], seen: Set<string>, s: Solver): number {
  const rank = (id: string) => s.graph.nodes.findIndex((n) => n.id === id);
  const open = queue.map((id, i) => ({ id, i })).filter(({ id }) => !seen.has(id) && SKELETON.includes(kindOf(s, id)!));
  return open.length ? open.reduce((a, b) => (rank(b.id) < rank(a.id) ? b : a)).i : -1;
}

function bfsOrder(kids: SpaceNode[], s: Solver): SpaceNode[] {
  const ids = new Set(kids.map((k) => k.id));
  const nbrs = (id: string) => s.graph.edges.map((e) => related(e, id)).filter((o): o is string => !!o && ids.has(o));
  const hub = [...kids].sort((a, b) => nbrs(b.id).length - nbrs(a.id).length)[0];
  const order: SpaceNode[] = [];
  const seen = new Set<string>();
  const queue = [hub.id];
  while (order.length < kids.length) {
    const first = nextSkeleton(queue, seen, s);
    const id = (first >= 0 ? queue.splice(first, 1)[0] : queue.shift()) ?? kids.find((k) => !seen.has(k.id))!.id;
    if (seen.has(id)) continue;
    seen.add(id);
    order.push(kids.find((k) => k.id === id)!);
    queue.push(...nbrs(id).filter((o) => !seen.has(o)));
  }
  return order;
}

function candidatesFor(kid: SpaceNode, size: [number, number], placed: Map<string, Rect>, s: Solver): Candidate[] {
  const links = s.graph.edges.filter((e) => related(e, kid.id) && placed.has(related(e, kid.id)!));
  const anchors = links.length ? links.map((e) => ({ id: related(e, kid.id)!, faces: e.relation === "faces", e })) : [...placed.keys()].map((id) => ({ id, faces: false, e: undefined }));
  const sides = shuffle(SIDES, s.rng);
  const [a, b] = size;
  const parentKind = kindOf(s, kid.parent);
  const gap = links.length ? 0 : (parentKind && GAP_INSIDE[parentKind]) ?? STREET_BY_STYLE[kid.style] ?? LAYOUT_RULES.street;
  const perpendicular = kid.kind === "bridge" || (kid.kind === "stair" && parentKind === "platform");
  const rigid = kid.heading !== undefined || s.graph.nodes.some((n) => n.parent === kid.id);
  return anchors.flatMap(({ id, faces, e }) => {
    const p = placed.get(id)!;
    const r = { x0: p.x0 - gap, z0: p.z0 - gap, x1: p.x1 + gap, z1: p.z1 + gap };
    if (faces) return sides.map((side) => facingSlot(id, r, Math.min(a, b), side));
    const anchorNode = s.graph.nodes.find((n) => n.id === id)!;
    const forced = e ? forcedSide(e, kid, anchorNode) : undefined;
    const allowed = forced ? [forced] : anchorNode.kind === "bridge" ? [s.sideOf.get(id)!] : sides;
    return allowed.flatMap((side) => {
      const along = side === "north" || side === "south";
      const orient: [number, number][] = rigid ? [[a, b]] : perpendicular ? [along ? [Math.min(a, b), Math.max(a, b)] : [Math.max(a, b), Math.min(a, b)]] : a === b ? [[a, b]] : [[a, b], [b, a]];
      return orient.flatMap(([w, d]) => candidatesAround(id, r, w, d, [side]));
    });
  });
}

const AXIAL: readonly SpaceKind[] = ["stair", "plaza", "causeway", "platform", "altar"];

/** How far a candidate sits from the middle of its anchor's side: axial pieces (stairway, plaza, causeway, adosada) want zero. */
function offAxis(c: Candidate, a: Rect): number {
  const along = c.side === "north" || c.side === "south";
  return along ? Math.abs((c.rect.x0 + c.rect.x1 - a.x0 - a.x1) / 2) : Math.abs((c.rect.z0 + c.rect.z1 - a.z0 - a.z1) / 2);
}

function placeOne(kid: SpaceNode, size: [number, number], placed: Map<string, Rect>, s: Solver): Rect {
  const peers = new Set(s.graph.edges.map((e) => related(e, kid.id)).filter((o): o is string => !!o));
  const all = [...placed.values()];
  const axial = kid.heading !== undefined && AXIAL.includes(kid.kind);
  let best: { c: Candidate; adj: number; off: number; strangers: number; area: number } | undefined;
  for (const c of candidatesFor(kid, size, placed, s)) {
    if (all.some((r) => overlaps(r, c.rect))) continue;
    const adj = [...placed].filter(([id, r]) => peers.has(id) && sharedEdge(r, c.rect) >= LAYOUT_RULES.minShared - 1e-6).length;
    const off = axial ? offAxis(c, placed.get(c.anchor)!) : 0;
    const strangers = [...placed].filter(([id, r]) => !peers.has(id) && sharedEdge(r, c.rect) > 1e-6).length;
    const area = bboxArea([...all, c.rect]);
    const tie = Math.abs(off - (best?.off ?? 0)) <= 1e-6;
    const better = !best || adj > best.adj || (adj === best.adj && (off < best.off - 1e-6 || (tie && (strangers < best.strangers || (strangers === best.strangers && area < best.area - 1e-6)))));
    if (better) best = { c, adj, off, strangers, area };
  }
  if (best) {
    s.sideOf.set(kid.id, best.c.side);
    return best.c.rect;
  }
  const box = bboxOf(all);
  s.log.push(`${kid.id}: sin hueco adyacente libre; colocado aparte al este del conjunto`);
  return { x0: box.x1 + LAYOUT_RULES.precinctMargin, x1: box.x1 + LAYOUT_RULES.precinctMargin + size[0], z0: box.z0, z1: box.z0 + size[1] };
}

const ON_TERRACE: readonly SpaceKind[] = ["stair", "shrine"];

/** A terrace's flights and shrines stand on its setback instead of widening it: the setback is the deepest of them, so every side steps back alike. */
function envelope(c: SpaceNode, placed: Map<string, Rect>, s: Solver): { box: Rect; margin: number } {
  const base = CONTAINER_MARGIN[c.kind] ?? LAYOUT_RULES.precinctMargin;
  const all = [...placed.values()];
  if (c.kind !== "platform") return { box: bboxOf(all), margin: base };
  const core = [...placed].filter(([id]) => !ON_TERRACE.includes(kindOf(s, id)!)).map(([, r]) => r);
  if (core.length === 0 || core.length === all.length) return { box: bboxOf(all), margin: base };
  const box = bboxOf(core);
  const out = all.map((r) => Math.max(box.x0 - r.x0, r.x1 - box.x1, box.z0 - r.z0, r.z1 - box.z1));
  return { box, margin: Math.max(base, ...out) };
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
  const { box, margin } = envelope(c, placed, s);
  const keeps = KEEPS_FOOTPRINT.includes(c.kind);
  const w = Math.max(keeps ? c.footprint[0] : 0, box.x1 - box.x0 + 2 * margin);
  const d = Math.max(keeps ? c.footprint[1] : 0, box.z1 - box.z0 + 2 * margin);
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
    const placed = { node: n, rect: shifted.get(n.id)!, level: n.level, y0: base, y1: base + (n.height ?? KIND_DIMENSIONS[n.kind].height) };
    spaces.set(n.id, placed);
    return placed;
  };
  graph.nodes.forEach(placeY);
  const placed = alignCauseways(graph.nodes.map((n) => spaces.get(n.id)!), graph.edges);
  checkGates(placed, graph.edges);
  return { spaces: placed, bounds: shifted.get(root.id)!, fallbacks: s.log };
}
