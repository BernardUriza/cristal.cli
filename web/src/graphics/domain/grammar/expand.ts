import { mulberry32, type Rng } from "../../../shared/rng.ts";
import { axiom, COMPLETION_BIAS, DEFAULT_BUDGET } from "./axioms.ts";
import { assertGoal, mergeGoals } from "./goal.ts";
import { RULES, ruleById } from "./rules.ts";
import { checkBudget, validateCall, validateGraph, validateProgram } from "./validate.ts";
import { GrammarError, type AppliedRule, type ArchitectureProgram, type GrammarContext, type GrammarRule, type RuleCall, type SpaceEdge, type SpaceGraph, type SpaceKind, type SpaceNode } from "./types.ts";

type State = { nodes: SpaceNode[]; edges: SpaceEdge[]; applied: AppliedRule[]; fallbacks: string[]; counters: Map<SpaceKind, number> };

function seedCounters(nodes: readonly SpaceNode[]): Map<SpaceKind, number> {
  const counters = new Map<SpaceKind, number>();
  for (const n of nodes) {
    const k = Number(n.id.slice(n.id.lastIndexOf("-") + 1));
    if (Number.isInteger(k)) counters.set(n.kind, Math.max(counters.get(n.kind) ?? 0, k));
  }
  return counters;
}

function apply(state: State, rule: GrammarRule, target: SpaceNode, params: RuleCall["params"], rng: Rng, budget: number, origin: AppliedRule["origin"]): void {
  const counters = new Map(state.counters);
  const ctx: GrammarContext = {
    rng,
    params,
    budget,
    nextId: (kind) => {
      const k = (counters.get(kind) ?? 0) + 1;
      counters.set(kind, k);
      return `${kind}-${k}`;
    },
  };
  const out = rule.expand(target, ctx);
  checkBudget(state.nodes.length, out.nodes.length, budget, `${rule.id} on ${target.id}`);
  state.counters = counters;
  state.nodes = [...state.nodes.map((n) => (n.id === target.id ? { ...n, depth: n.depth + 1 } : n)), ...out.nodes];
  state.edges = [...state.edges, ...out.edges];
  state.applied.push({ rule: rule.id, target: target.id, origin, added: out.nodes.map((n) => n.id) });
}

function unexpandedComplexes(state: State): SpaceNode[] {
  return state.nodes.filter((n) => n.kind === "complex" && !state.edges.some((e) => e.relation === "contains" && e.from === n.id));
}

function weightedPick(rng: Rng, options: { rule: GrammarRule; w: number }[]): GrammarRule {
  const total = options.reduce((s, o) => s + o.w, 0);
  let r = rng() * total;
  for (const o of options) if ((r -= o.w) < 0) return o.rule;
  return options[options.length - 1].rule;
}

function minimalParams(rule: GrammarRule): RuleCall["params"] {
  return Object.fromEntries(Object.entries(rule.params).map(([k, r]) => [k, r.min]));
}

function complete(state: State, program: ArchitectureProgram, rng: Rng, budget: number): void {
  const tried = new Set<string>();
  for (let target: SpaceNode | undefined = unexpandedComplexes(state)[0]; target; target = unexpandedComplexes(state).find((n) => !tried.has(n.id))) {
    tried.add(target.id);
    const bias = COMPLETION_BIAS[program.archetype];
    const options = RULES.filter((r) => r.accepts.includes("complex") && target.depth < r.maxDepth).map((rule) => ({ rule, w: rule.weight * (bias[rule.id] ?? 1) })).filter((o) => o.w > 0);
    if (options.length === 0) {
      state.fallbacks.push(`${target.id}: ninguna regla acepta profundidad ${target.depth}; queda como recinto vacío`);
      continue;
    }
    const rule = weightedPick(rng, options);
    try {
      apply(state, rule, target, {}, rng, budget, "completion");
    } catch (err) {
      if (!(err instanceof GrammarError) || err.code !== "budget-exceeded") throw err;
      try {
        apply(state, rule, target, minimalParams(rule), rng, budget, "completion");
        state.fallbacks.push(`${target.id}: ${rule.id} con parámetros mínimos para caber en el presupuesto ${budget}`);
      } catch (again) {
        if (!(again instanceof GrammarError) || again.code !== "budget-exceeded") throw again;
        state.fallbacks.push(`${target.id}: presupuesto ${budget} agotado; queda como recinto vacío`);
      }
    }
  }
}

export function expandProgram(program: ArchitectureProgram, budget = DEFAULT_BUDGET): SpaceGraph {
  validateProgram(program);
  const rng = mulberry32(program.seed);
  const start = axiom(program.archetype);
  const state: State = { ...start, applied: [], fallbacks: [], counters: seedCounters(start.nodes) };
  for (const call of program.rules) {
    const { rule, target } = validateCall(state.nodes, call);
    apply(state, rule, target, call.params, rng, budget, "program");
  }
  complete(state, program, rng, budget);
  const goal = mergeGoals([program.goal, ...program.rules.map((c) => ruleById(c.rule)?.goal)]);
  const graph: SpaceGraph = { archetype: program.archetype, nodes: state.nodes, edges: state.edges, applied: state.applied, fallbacks: state.fallbacks, goal };
  validateGraph(graph);
  return { ...graph, topology: assertGoal(graph, goal) };
}
