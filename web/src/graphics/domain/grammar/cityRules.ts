import { closeLoop, matchLength, parallelSibling, wantsLoop } from "./cityLoop.ts";
import { between, contained, count, edge, node } from "./ruleKit.ts";
import type { Expansion, GrammarContext, GrammarRule, Heading, SpaceNode } from "./types.ts";

const STREET_WIDTH = 4;

const FRONTAGE_TALLEST = 9;

const turn = (h: Heading, by: number): Heading => (((h + by) % 360) + 360) % 360 as Heading;

const headingOf = (t: SpaceNode): Heading => t.heading ?? (t.footprint[0] >= t.footprint[1] ? 0 : 90);

function building(ctx: GrammarContext, t: SpaceNode, parent: string, tallest = 18): SpaceNode {
  const fp: [number, number] = [Math.round(between(ctx, 4, 7.5)), Math.round(between(ctx, 4, 7.5))];
  return node(ctx, "building", t, parent, fp, 0, { height: Math.round(between(ctx, 5, tallest)) });
}

export const R9: GrammarRule = {
  id: "R9",
  accepts: ["complex"],
  weight: 2,
  maxDepth: 4,
  params: { blocks: { min: 3, max: 5 }, buildings: { min: 1, max: 4 } },
  goal: { minBranchNodes: 2, minCycles: 1, minIndependentBuildings: 4 },
  expand(t, ctx): Expansion {
    const ring = node(ctx, "street-ring", t, t.id, [t.footprint[0] * 0.5, t.footprint[1] * 0.5]);
    const side = Math.round(between(ctx, 11, 16));
    const plaza = node(ctx, "plaza", t, ring.id, [side, side]);
    const n = count(ctx, "blocks", 3, 5);
    const blocks = Array.from({ length: n }, () => node(ctx, "block", t, t.id, [12, 12]));
    const houses = blocks.map((b) => Array.from({ length: count(ctx, "buildings", 1, 4) }, () => building(ctx, t, b.id)));
    const edges = [
      ...contained(t, [ring, ...blocks]),
      edge(ring.id, plaza.id, "contains"),
      ...blocks.flatMap((b, i) => [...contained(b, houses[i]), edge(b.id, ring.id, "connects"), edge(b.id, plaza.id, "faces")]),
    ];
    return { nodes: [ring, plaza, ...blocks, ...houses.flat()], edges };
  },
};

export const R10: GrammarRule = {
  id: "R10",
  accepts: ["street", "gallery"],
  weight: 1,
  maxDepth: 6,
  params: { length: { min: 8, max: 18 }, frontage: { min: 0, max: 2 }, loop: { min: 0, max: 1 } },
  goal: { minBranchNodes: 1 },
  expand(t, ctx): Expansion {
    const h = headingOf(t);
    const junction = node(ctx, "junction", t, t.parent, [STREET_WIDTH, STREET_WIDTH], 0, { heading: h });
    const street = (heading: Heading): SpaceNode => {
      const length = typeof ctx.params.length === "number" ? ctx.params.length : Math.round(between(ctx, 10, 16));
      const fp: [number, number] = heading % 180 === 0 ? [length, STREET_WIDTH] : [STREET_WIDTH, length];
      return node(ctx, "street", t, t.parent, fp, 0, { heading });
    };
    const branches = [street(turn(h, 90)), street(h), street(turn(h, -90))];
    const sibling = parallelSibling(t, branches[2].heading!, ctx);
    const lots = branches.map((b) => Array.from({ length: count(ctx, "frontage", 1, 2) }, () => building(ctx, t, t.parent ?? b.id, FRONTAGE_TALLEST)));
    const loop = sibling && wantsLoop(ctx) ? closeLoop(ctx, t, turn(h, 180), branches[2], sibling, STREET_WIDTH) : { nodes: [], edges: [] };
    if (sibling && loop.nodes.length) branches[2] = matchLength(branches[2], sibling);
    const parent = t.parent ? contained({ ...t, id: t.parent }, [junction, ...branches, ...lots.flat(), ...loop.nodes]) : [];
    const fronts = branches.flatMap((b, i) => lots[i].map((l) => edge(l.id, b.id, "connects")));
    const edges = [...parent, edge(junction.id, t.id, "connects"), ...branches.map((b) => edge(b.id, junction.id, "connects")), ...fronts, ...loop.edges];
    return { nodes: [junction, ...branches, ...lots.flat(), ...loop.nodes], edges, goal: loop.goal };
  },
};
