import { between, contained, count, edge, node } from "./ruleKit.ts";
import type { Expansion, GrammarRule, Heading } from "./types.ts";

type ShrineShape = { footprint: [number, number]; height: number };

const SHRINE_SHAPES: readonly ShrineShape[] = [
  { footprint: [5, 5], height: 6.5 },
  { footprint: [4, 7.5], height: 4.5 },
  { footprint: [7, 3.5], height: 5.5 },
  { footprint: [3.5, 3.5], height: 9 },
];

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
