import { fnv1a, mulberry32, pick, type Rng } from "../../../../../shared/rng.ts";
import { MOTIF_IDS } from "../index.ts";
import { FAMILY_PRODUCTIONS } from "./families.ts";
import { LIMB_PRODUCTIONS } from "./limbs.ts";
import { BODY_TUNING, CHIMERIC_SLOTS, SLOT_DEFAULTS } from "./tuning.ts";
import { instanceCount, validateBody } from "./validate.ts";
import { BODY_FAMILIES, BodyGraphError, type AppliedBodyRule, type BodyContext, type BodyGraph, type BodyProduction, type BodyProgram, type BodySlot, type PartKind, type PartNode } from "./types.ts";

type State = Pick<BodyGraph, "root" | "nodes" | "edges" | "applied" | "fallbacks">;

function slotKind(program: BodyProgram, rng: Rng): (slot: BodySlot) => PartKind {
  return (slot) => {
    const chosen = program.motifs?.[slot];
    if (chosen) return { motif: chosen };
    if (program.family === "chimera" && CHIMERIC_SLOTS.indexOf(slot) >= 0) return { motif: pick(rng, MOTIF_IDS) };
    return SLOT_DEFAULTS[program.family][slot];
  };
}

function apply(state: State, rule: BodyProduction, target: PartNode, ctx: BodyContext, budget: number, origin: AppliedBodyRule["origin"]): void {
  const out = rule.expand(target, ctx);
  const next = { root: state.root, nodes: [...state.nodes, ...out.nodes], edges: [...state.edges, ...out.edges] };
  const n = instanceCount(next);
  if (n > budget) throw new BodyGraphError("budget-exceeded", `${rule.id} on ${target.id} would make ${n} pieces (budget ${budget})`);
  state.nodes = next.nodes;
  state.edges = next.edges;
  state.applied.push({ rule: rule.id, target: target.id, origin, added: out.nodes.map((m) => m.id) });
}

function weighted(rng: Rng, options: readonly BodyProduction[]): BodyProduction | undefined {
  const total = options.reduce((s, o) => s + o.weight, BODY_TUNING.restWeight);
  let r = rng() * total;
  for (const o of options) if ((r -= o.weight) < 0) return o;
  return undefined;
}

function complete(state: State, ctx: BodyContext, budget: number): void {
  for (let i = 0; i < state.nodes.length; i++) {
    const target = state.nodes[i];
    if (state.edges.some((e) => e.from === target.id)) continue;
    const options = LIMB_PRODUCTIONS.filter((p) => p.accepts.indexOf(target.role) >= 0 && target.depth < p.maxDepth && (p.when?.(target) ?? true));
    const rule = options.length ? weighted(ctx.rng, options) : undefined;
    if (!rule) continue;
    try {
      apply(state, rule, target, ctx, budget, "completion");
    } catch (err) {
      if (!(err instanceof BodyGraphError) || err.code !== "budget-exceeded") throw err;
      state.fallbacks.push(`${target.id}: ${rule.id} no cabe en el presupuesto ${budget}; queda sin rematar`);
    }
  }
}

export function expandBody(program: BodyProgram): BodyGraph {
  if (BODY_FAMILIES.indexOf(program.family) < 0) throw new BodyGraphError("unknown-family", String(program.family));
  if (!Number.isInteger(program.seed) || program.seed < 0) throw new BodyGraphError("bad-param", `seed must be a non-negative integer, got ${program.seed}`);
  const budget = program.budget ?? BODY_TUNING.budget;
  const rng = mulberry32(fnv1a(`cuerpo:${program.family}:${program.seed}`));
  const counters = new Map<string, number>();
  const nextId = (base: string): string => {
    const k = (counters.get(base) ?? 0) + 1;
    counters.set(base, k);
    return `${base}-${k}`;
  };
  const ctx: BodyContext = { rng, family: program.family, nextId, kind: slotKind(program, rng) };
  const root: PartNode = { id: nextId("torso"), kind: ctx.kind("torso"), role: "enclosure", scale: 1, depth: 0 };
  const state: State = { root: root.id, nodes: [root], edges: [], applied: [], fallbacks: [] };
  apply(state, FAMILY_PRODUCTIONS[program.family], root, ctx, budget, "program");
  complete(state, ctx, budget);
  const graph: BodyGraph = { family: program.family, fit: "bounds", ...state };
  validateBody(graph, budget);
  return graph;
}
