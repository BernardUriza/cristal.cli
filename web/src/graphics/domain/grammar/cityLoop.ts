import { edge, node } from "./ruleKit.ts";
import type { Expansion, GrammarContext, Heading, SpaceEdge, SpaceNode } from "./types.ts";

export const LOOP_CHANCE = 0.5;

const lengthOf = (n: SpaceNode): number => Math.max(...n.footprint);

const connects = (from: string, to: string) => (e: SpaceEdge) => e.relation === "connects" && e.from === from && e.to === to;

export function parallelSibling(t: SpaceNode, heading: Heading, ctx: GrammarContext): SpaceNode | undefined {
  const g = ctx.graph;
  if (!g) return undefined;
  const junction = g.nodes.find((n) => n.kind === "junction" && g.edges.some(connects(t.id, n.id)));
  if (!junction) return undefined;
  return g.nodes.find((n) => n.kind === "street" && n.id !== t.id && n.heading === heading && g.edges.some(connects(n.id, junction.id)));
}

export function wantsLoop(ctx: GrammarContext): boolean {
  const given = ctx.params.loop;
  return typeof given === "number" ? given >= 1 : ctx.rng() < LOOP_CHANCE;
}

export function matchLength(c: SpaceNode, sibling: SpaceNode): SpaceNode {
  const length = lengthOf(sibling);
  return { ...c, footprint: c.footprint[0] >= c.footprint[1] ? [length, c.footprint[1]] : [c.footprint[0], length] };
}

/** STREET_C runs parallel to its sibling at the previous junction; a cross street as long as the target joins both ends and closes the block. */
export function closeLoop(ctx: GrammarContext, t: SpaceNode, back: Heading, c: SpaceNode, sibling: SpaceNode, width: number): Expansion {
  const length = lengthOf(t);
  const fp: [number, number] = back % 180 === 0 ? [length, width] : [width, length];
  const cross = node(ctx, "street", t, t.parent, fp, 0, { heading: back });
  return { nodes: [cross], edges: [edge(cross.id, c.id, "connects"), edge(cross.id, sibling.id, "connects")], goal: { minCycles: 1 } };
}
