import type { GrammarContext, SpaceEdge, SpaceKind, SpaceNode } from "./types.ts";

export const GALLERY_DEPTH = 3.5;

const half = (m: number): number => Math.max(2, Math.round(m * 2) / 2);

export function node(ctx: GrammarContext, kind: SpaceKind, target: SpaceNode, parent: string | undefined, footprint: [number, number], level = 0, extra: Partial<SpaceNode> = {}): SpaceNode {
  return { id: ctx.nextId(kind), kind, parent, level, footprint: [half(footprint[0]), half(footprint[1])], style: target.style, depth: target.depth + 1, ...extra };
}

export function count(ctx: GrammarContext, key: string, min: number, max: number): number {
  const given = ctx.params[key];
  if (typeof given === "number") return given;
  return min + Math.floor(ctx.rng() * (max - min + 1));
}

export const between = (ctx: GrammarContext, min: number, max: number): number => min + ctx.rng() * (max - min);

export const edge = (from: string, to: string, relation: SpaceEdge["relation"]): SpaceEdge => ({ from, to, relation });

export function contained(parent: SpaceNode, nodes: SpaceNode[]): SpaceEdge[] {
  return nodes.map((n) => edge(parent.id, n.id, "contains"));
}
