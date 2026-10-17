import { between, contained, count, edge, node } from "./ruleKit.ts";
import type { Expansion, GrammarRule, Heading } from "./types.ts";

type ShrineShape = { footprint: [number, number]; height: number };

const SHRINE_SHAPES: readonly ShrineShape[] = [
  { footprint: [5, 5], height: 6.5 },
  { footprint: [4, 7.5], height: 4.5 },
  { footprint: [7, 3.5], height: 5.5 },
  { footprint: [3.5, 3.5], height: 9 },
];

const TERRACE_RISE = 2.4;

const QUARTERS: readonly Heading[] = [0, 180, 90, 270];

export const R7: GrammarRule = {
  id: "R7",
  accepts: ["complex"],
  weight: 2,
  maxDepth: 4,
  params: { shrines: { min: 3, max: 6 } },
  goal: { minCycles: 1, minBranchNodes: 1 },
  expand(t, ctx): Expansion {
    const ring = node(ctx, "ring-gallery", t, t.id, [t.footprint[0] * 0.5, t.footprint[1] * 0.5]);
    const side = Math.max(7, Math.min(10, Math.min(...t.footprint) * 0.22));
    const sanctuary = node(ctx, "sanctuary", t, ring.id, [side, side], 0, { height: Math.round(between(ctx, 7, 9) * 2) / 2 });
    const n = count(ctx, "shrines", 3, 6);
    const offset = Math.floor(ctx.rng() * SHRINE_SHAPES.length);
    const quarter = Math.floor(ctx.rng() * 4);
    const shrines = Array.from({ length: n }, (_, i) => {
      const shape = SHRINE_SHAPES[(offset + i) % SHRINE_SHAPES.length];
      return node(ctx, "shrine", t, t.id, shape.footprint, 0, { height: shape.height, heading: QUARTERS[(quarter + i) % 4] });
    });
    const links = shrines.flatMap((s) => [edge(s.id, ring.id, "connects"), edge(s.id, sanctuary.id, "faces")]);
    return { nodes: [ring, sanctuary, ...shrines], edges: [...contained(t, [ring, ...shrines]), edge(ring.id, sanctuary.id, "contains"), ...links] };
  },
};

export const R8: GrammarRule = {
  id: "R8",
  accepts: ["complex"],
  weight: 2,
  maxDepth: 4,
  params: {},
  goal: { minElevationLevels: 3 },
  expand(t, ctx): Expansion {
    const extra = { height: TERRACE_RISE };
    const p0 = node(ctx, "platform", t, t.id, [t.footprint[0] * 0.8, t.footprint[1] * 0.8], 0, extra);
    const p1 = node(ctx, "platform", t, p0.id, [t.footprint[0] * 0.6, t.footprint[1] * 0.6], 1, extra);
    const p2 = node(ctx, "platform", t, p1.id, [t.footprint[0] * 0.4, t.footprint[1] * 0.4], 2, extra);
    const s0 = node(ctx, "stair", t, p0.id, [3, 6], 1, extra);
    const s1 = node(ctx, "stair", t, p1.id, [3, 6], 2, extra);
    const side = Math.round(between(ctx, 7, 10));
    const sanctuary = node(ctx, "sanctuary", t, p2.id, [side, side], 3, { height: Math.round(between(ctx, 7, 10) * 2) / 2 });
    const edges = [
      edge(t.id, p0.id, "contains"),
      ...contained(p0, [p1, s0]),
      ...contained(p1, [p2, s1]),
      edge(p2.id, sanctuary.id, "contains"),
      edge(s0.id, p1.id, "connects"),
      edge(s0.id, p0.id, "connects"),
      edge(s1.id, p2.id, "connects"),
      edge(s1.id, p1.id, "connects"),
    ];
    return { nodes: [p0, p1, p2, s0, s1, sanctuary], edges };
  },
};
