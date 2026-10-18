import type { Rect } from "../architecture/layout.ts";
import { BANQUETTE } from "./dimensions.ts";
import { overlaps, sharedEdge, type Side } from "./place.ts";
import { GrammarError, type Heading, type SpaceEdge, type SpaceNode } from "./types.ts";

type Placed = { node: SpaceNode; rect: Rect };

export type Gate = { side: Side; from: number; to: number; serves: string[] };

const EPS = 1e-6;

const SIDE_OF: Record<Heading, Side> = { 0: "east", 90: "south", 180: "west", 270: "north" };

const runsAlongX = (s: Side) => s === "north" || s === "south";

const span = (r: Rect, s: Side): [number, number] => (runsAlongX(s) ? [r.x0, r.x1] : [r.z0, r.z1]);

/** The wall between the corner banquettes, where a gate may open. */
export const doorSpan = (r: Rect, s: Side): [number, number] => {
  const [lo, hi] = span(r, s);
  return [lo + BANQUETTE.width, hi - BANQUETTE.width];
};

function touching(enc: Rect, r: Rect): Side | undefined {
  if (sharedEdge(enc, r) <= EPS) return undefined;
  if (Math.abs(r.z1 - enc.z0) < EPS) return "north";
  if (Math.abs(r.z0 - enc.z1) < EPS) return "south";
  if (Math.abs(r.x1 - enc.x0) < EPS) return "west";
  return Math.abs(r.x0 - enc.x1) < EPS ? "east" : undefined;
}

const linked = (edges: readonly SpaceEdge[], a: string, b: string) => edges.some((e) => e.relation === "connects" && ((e.from === a && e.to === b) || (e.from === b && e.to === a)));

const groundStairs = (spaces: readonly Placed[], enc: Placed) => spaces.filter((s) => s.node.parent === enc.node.id && s.node.kind === "stair" && s.node.heading !== undefined);

/** Every opening the enclosure's banquettes need: one on each ground stairway's axis and one where the causeway meets it, overlapping ones merged. */
export function gatesOf(enc: Placed, spaces: readonly Placed[], edges: readonly SpaceEdge[]): Gate[] {
  const raw: Gate[] = groundStairs(spaces, enc).map((s) => {
    const side = SIDE_OF[s.node.heading!];
    const [from, to] = span(s.rect, side);
    return { side, from, to, serves: [s.node.id] };
  });
  for (const c of spaces.filter((s) => s.node.kind === "causeway" && linked(edges, s.node.id, enc.node.id))) {
    const side = touching(enc.rect, c.rect);
    if (side) raw.push({ side, from: span(c.rect, side)[0], to: span(c.rect, side)[1], serves: [c.node.id] });
  }
  const out: Gate[] = [];
  for (const g of [...raw].sort((a, b) => a.side.localeCompare(b.side) || a.from - b.from)) {
    const last = out[out.length - 1];
    if (last && last.side === g.side && g.from <= last.to + EPS) out[out.length - 1] = { ...last, to: Math.max(last.to, g.to), serves: [...last.serves, ...g.serves] };
    else out.push(g);
  }
  return out;
}

/** The causeway slides along the enclosure's side onto the front stairway's axis, when it fits between the corners and hits nothing. */
export function alignCauseways<T extends Placed>(spaces: readonly T[], edges: readonly SpaceEdge[]): T[] {
  const out = [...spaces];
  out.forEach((c, i) => {
    if (c.node.kind !== "causeway") return;
    const enc = out.find((e) => e.node.kind === "precinct" && linked(edges, c.node.id, e.node.id));
    const side = enc && touching(enc.rect, c.rect);
    if (!enc || !side) return;
    const stair = groundStairs(out, enc).find((s) => SIDE_OF[s.node.heading!] === side);
    if (!stair) return;
    const [lo, hi] = doorSpan(enc.rect, side);
    const [a, b] = span(c.rect, side);
    const [sa, sb] = span(stair.rect, side);
    const shift = Math.min(hi - b, Math.max(lo - a, (sa + sb) / 2 - (a + b) / 2));
    const rect = runsAlongX(side) ? { ...c.rect, x0: c.rect.x0 + shift, x1: c.rect.x1 + shift } : { ...c.rect, z0: c.rect.z0 + shift, z1: c.rect.z1 + shift };
    const blocked = out.some((o) => o !== c && o !== enc && o.node.parent === c.node.parent && overlaps(o.rect, rect));
    if (!blocked) out[i] = { ...c, rect };
  });
  return out;
}

/** Every gate opens between the corner banquettes and the causeway passes wholly through one: else the enclosure walls in its own approach. */
export function checkGates(spaces: readonly Placed[], edges: readonly SpaceEdge[]): void {
  for (const enc of spaces.filter((s) => s.node.kind === "precinct")) {
    const gates = gatesOf(enc, spaces, edges);
    for (const g of gates) {
      const [lo, hi] = doorSpan(enc.rect, g.side);
      if (g.from < lo - EPS || g.to > hi + EPS) throw new GrammarError("blocked-gate", `${enc.node.id}: el vano de ${g.serves.join(", ")} (${g.side}) cae sobre la banqueta de esquina`);
    }
    for (const c of spaces.filter((s) => s.node.kind === "causeway" && linked(edges, s.node.id, enc.node.id))) {
      const side = touching(enc.rect, c.rect);
      const [a, b] = side ? span(c.rect, side) : [0, 0];
      if (!side || !gates.some((g) => g.side === side && g.from <= a + EPS && g.to >= b - EPS)) throw new GrammarError("blocked-gate", `${c.node.id} no llega a un vano de ${enc.node.id}`);
    }
  }
}
