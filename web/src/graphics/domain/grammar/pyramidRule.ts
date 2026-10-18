import { between, count, edge, node } from "./ruleKit.ts";
import type { Expansion, GrammarContext, GrammarRule, Heading, SpaceEdge, SpaceKind, SpaceNode } from "./types.ts";

export const PYRAMID_PROFILES = ["tablero", "nichos", "talud"] as const;

/** Run per metre of rise and total height: Teotihuacan spreads low, El Tajín sits between, Tikal climbs steep and tall. */
const PROPORTIONS: Record<(typeof PYRAMID_PROFILES)[number], { run: number; height: [number, number] }> = {
  tablero: { run: 1.3, height: [16, 26] },
  nichos: { run: 0.9, height: [18, 28] },
  talud: { run: 0.6, height: [24, 36] },
};

/** East or south: the two faces the program views (azimuth 0.48–0.74) show, so the stairway reads. */
const FRONTS: readonly Heading[] = [0, 90];

const turn = (h: Heading, by: number): Heading => ((h + by) % 360) as Heading;

const facing = (h: Heading, along: number, deep: number): [number, number] => (h % 180 === 90 ? [along, deep] : [deep, along]);

const round = (m: number, step = 0.5): number => Math.round(m / step) * step;

function directions(front: Heading, n: number): Heading[] {
  if (n === 1) return [front];
  if (n === 2) return [front, turn(front, 180)];
  return [front, turn(front, 90), turn(front, 180), turn(front, 270)];
}

type Builder = { nodes: SpaceNode[]; edges: SpaceEdge[]; child: (kind: SpaceKind, parent: string, fp: [number, number], level: number, extra?: Partial<SpaceNode>) => SpaceNode };

function builder(ctx: GrammarContext, t: SpaceNode): Builder {
  const b: Builder = {
    nodes: [],
    edges: [],
    child(kind, parent, fp, level, extra = {}) {
      const n = node(ctx, kind, t, parent, fp, level, extra);
      b.nodes.push(n);
      b.edges.push(edge(parent, n.id, "contains"));
      return n;
    },
  };
  return b;
}

/** Stepped pyramid after real precedents: 3–7 bodies, 1, 2 opposite or 4 stairways, optional adosada and roof comb, terrace shrines, a plaza with its altar, flanking platforms, an optional Ciudadela enclosure and a causeway on the front axis. */
export const R8: GrammarRule = {
  id: "R8",
  accepts: ["complex"],
  weight: 2,
  maxDepth: 4,
  params: { bodies: { min: 3, max: 7 }, stairs: { min: 1, max: 4 }, adosada: { min: 0, max: 1 }, crest: { min: 0, max: 1 }, adoratorios: { min: 0, max: 2 }, flancos: { min: 0, max: 2 }, recinto: { min: 0, max: 1 } },
  goal: { minElevationLevels: 3, minIndependentBuildings: 2 },
  expand(t, ctx): Expansion {
    const bodies = count(ctx, "bodies", 3, 7);
    const stairs = count(ctx, "stairs", 1, 3);
    const dirs = directions(FRONTS[Math.floor(ctx.rng() * FRONTS.length)], stairs >= 3 ? 4 : stairs);
    const front = dirs[0];
    const adosada = count(ctx, "adosada", 0, 1) === 1;
    const crest = count(ctx, "crest", 0, 1) === 1;
    const shrines = count(ctx, "adoratorios", 0, 2);
    const style = PYRAMID_PROFILES[Math.floor(ctx.rng() * PYRAMID_PROFILES.length)];
    const shape = PROPORTIONS[style];
    const rise = round(Math.min(7, Math.max(2.4, between(ctx, ...shape.height) / bodies)), 0.1);
    const depth = Math.max(2.5, round(rise * shape.run));
    const width = round(between(ctx, 4, 7));
    const b = builder(ctx, t);
    const flight = (parent: string, upper: SpaceNode, h: Heading, level: number): SpaceNode => {
      const s = b.child("stair", parent, facing(h, width, depth), level, { height: rise, heading: h });
      b.edges.push(edge(s.id, upper.id, "connects"));
      return s;
    };
    const enclosure = count(ctx, "recinto", 0, 1) === 1 ? b.child("precinct", t.id, [10, 10], 0, { style }) : undefined;
    const site = enclosure?.id ?? t.id;
    const platforms: SpaceNode[] = [];
    for (let k = 0; k < bodies; k++) platforms.push(b.child("platform", k === 0 ? site : platforms[k - 1].id, [10, 10], k, { height: rise, style }));
    for (let k = 0; k + 1 < bodies; k++) for (const h of dirs) b.edges.push(edge(flight(platforms[k].id, platforms[k + 1], h, k + 1).id, platforms[k].id, "connects"));
    const top = platforms[bodies - 1];
    const side = round(between(ctx, 6, 9));
    const temple = b.child("sanctuary", top.id, [side, side], bodies, { height: round(between(ctx, 5, 8)), heading: front, style: "pyramid" });
    if (crest) b.edges.push(edge(b.child("crest", top.id, [side, side], bodies + 1, { height: round(between(ctx, 3.5, 6.5)), heading: front }).id, temple.id, "above"));
    for (let i = 0; i < shrines && bodies > 2; i++) {
      const k = 1 + Math.floor(ctx.rng() * (bodies - 2));
      b.edges.push(edge(b.child("shrine", platforms[k].id, [2.5, 2.5], k + 1, { height: 3, heading: front, style }).id, platforms[k + 1].id, "connects"));
    }
    const lead = adosada ? b.child("platform", site, facing(front, round(between(ctx, 10, 16)), round(between(ctx, 6, 10))), 0, { height: rise, heading: front, style }) : platforms[0];
    if (adosada) b.edges.push(edge(lead.id, platforms[0].id, "connects"));
    const ground = dirs.map((h) => flight(site, h === front ? lead : platforms[0], h, 0));
    const base = side + 4 + (bodies - 1) * 2 * depth;
    const plaza = b.child("plaza", site, facing(front, round(base * between(ctx, 0.85, 1.05)), round(base * between(ctx, 0.35, 0.55))), 0, { heading: front });
    b.edges.push(edge(plaza.id, ground[0].id, "connects"));
    const altar = round(between(ctx, 4, 6));
    b.child("altar", plaza.id, [altar, altar], 0, { height: round(between(ctx, 1.2, 2), 0.1), style });
    const causeway = b.child("causeway", t.id, facing(front, 8, round(between(ctx, 10, 18))), 0, { heading: front });
    b.edges.push(edge(causeway.id, enclosure?.id ?? plaza.id, "connects"));
    const flanks = count(ctx, "flancos", 0, 2);
    for (let i = 0; i < flanks; i++) for (const h of [turn(front, 90), turn(front, 270)]) {
      const fp = facing(h, round(between(ctx, 8, 12)), round(between(ctx, 6, 9)));
      b.edges.push(edge(b.child("altar", site, fp, 0, { height: round(between(ctx, 2.5, 4.5)), heading: h, style }).id, plaza.id, "connects"));
    }
    return { nodes: b.nodes, edges: b.edges };
  },
};
