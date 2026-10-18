import { contained, count, edge, GALLERY_DEPTH, node } from "./ruleKit.ts";
import { R8 } from "./pyramidRule.ts";
import { R7 } from "./templeRules.ts";
import { R10, R9 } from "./cityRules.ts";
import type { Expansion, GrammarRule } from "./types.ts";

export const R1: GrammarRule = {
  id: "R1",
  accepts: ["complex"],
  weight: 3,
  maxDepth: 5,
  params: { galleries: { min: 2, max: 4 } },
  expand(t, ctx): Expansion {
    const court = node(ctx, "courtyard", t, t.id, [t.footprint[0] * 0.55, t.footprint[1] * 0.55]);
    const sides = count(ctx, "galleries", 2, 4);
    const galleries = Array.from({ length: sides }, (_, i) => node(ctx, "gallery", t, t.id, [i % 2 === 0 ? court.footprint[0] : court.footprint[1], GALLERY_DEPTH]));
    return { nodes: [court, ...galleries], edges: [...contained(t, [court, ...galleries]), ...galleries.map((g) => edge(g.id, court.id, "faces"))] };
  },
};

export const R2: GrammarRule = {
  id: "R2",
  accepts: ["complex"],
  weight: 3,
  maxDepth: 5,
  params: { chambers: { min: 2, max: 6 } },
  expand(t, ctx): Expansion {
    const hall = node(ctx, "hall", t, t.id, [t.footprint[0] * 0.4, t.footprint[1] * 0.35]);
    const n = count(ctx, "chambers", 2, 6);
    const chambers = Array.from({ length: n }, () => node(ctx, "chamber", t, t.id, [t.footprint[0] * 0.2, t.footprint[1] * 0.2]));
    return { nodes: [hall, ...chambers], edges: [...contained(t, [hall, ...chambers]), ...chambers.map((c) => edge(c.id, hall.id, "connects"))] };
  },
};

export const R3: GrammarRule = {
  id: "R3",
  accepts: ["complex"],
  weight: 2,
  maxDepth: 5,
  params: { chambers: { min: 1, max: 3 } },
  expand(t, ctx): Expansion {
    const tower = node(ctx, "tower", t, t.id, [6, 6]);
    const stair = node(ctx, "stair", t, t.id, [3, 7]);
    const n = count(ctx, "chambers", 1, 3);
    const chambers = Array.from({ length: n }, (_, k) => node(ctx, "chamber", t, t.id, [7, 7], k));
    const stack = chambers.slice(1).map((c, k) => edge(c.id, chambers[k].id, "above"));
    const edges = [...contained(t, [tower, stair, ...chambers]), edge(stair.id, tower.id, "connects"), edge(chambers[0].id, stair.id, "connects"), ...stack];
    return { nodes: [tower, stair, ...chambers], edges };
  },
};

export const R4: GrammarRule = {
  id: "R4",
  accepts: ["gallery"],
  weight: 2,
  maxDepth: 6,
  params: {},
  expand(t, ctx): Expansion {
    const bridge = node(ctx, "bridge", t, t.parent, [7, 2.5], 1);
    const tower = node(ctx, "tower", t, t.parent, [6, 6]);
    const parent = t.parent ? [edge(t.parent, bridge.id, "contains"), edge(t.parent, tower.id, "contains")] : [];
    return { nodes: [bridge, tower], edges: [...parent, edge(bridge.id, t.id, "connects"), edge(bridge.id, tower.id, "connects"), edge(t.id, tower.id, "bridges")] };
  },
};

export const R5: GrammarRule = {
  id: "R5",
  accepts: ["courtyard"],
  weight: 1,
  maxDepth: 3,
  params: { scale: { min: 0.3, max: 0.75 } },
  expand(t, ctx): Expansion {
    const s = typeof ctx.params.scale === "number" ? ctx.params.scale : 0.6;
    const inner = node(ctx, "complex", t, t.id, [t.footprint[0] * s, t.footprint[1] * s]);
    return { nodes: [inner], edges: [edge(t.id, inner.id, "contains")] };
  },
};

export const R6: GrammarRule = {
  id: "R6",
  accepts: ["hall"],
  weight: 1,
  maxDepth: 3,
  params: {},
  expand(t, ctx): Expansion {
    const court = node(ctx, "courtyard", t, t.parent, [t.footprint[0] * 1.2, t.footprint[1] * 1.1]);
    const galleries = [0, 1].map(() => node(ctx, "gallery", t, t.parent, [t.footprint[1], GALLERY_DEPTH]));
    const parent = t.parent ? contained({ ...t, id: t.parent }, [court, ...galleries]) : [];
    const links = galleries.flatMap((g) => [edge(g.id, t.id, "connects"), edge(g.id, court.id, "connects")]);
    return { nodes: [...galleries, court], edges: [...parent, ...links] };
  },
};

export const RULES: readonly GrammarRule[] = [R1, R2, R3, R4, R5, R6, R7, R8, R9, R10];

export function ruleById(id: string): GrammarRule | undefined {
  return RULES.find((r) => r.id === id);
}
