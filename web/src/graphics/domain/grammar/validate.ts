import { ruleById } from "./rules.ts";
import { ARCHETYPES, GrammarError, type ArchitectureProgram, type GrammarRule, type RuleCall, type SpaceEdge, type SpaceGraph, type SpaceNode } from "./types.ts";

export function validateParams(rule: GrammarRule, params: RuleCall["params"]): void {
  for (const [key, value] of Object.entries(params)) {
    const range = rule.params[key];
    if (!range) throw new GrammarError("bad-param", `${rule.id} has no parameter "${key}"`);
    if (typeof value !== "number" || !Number.isFinite(value)) throw new GrammarError("bad-param", `${rule.id}.${key} must be a number, got ${String(value)}`);
    if (value < range.min || value > range.max) throw new GrammarError("bad-param", `${rule.id}.${key}=${value} outside ${range.min}..${range.max}`);
  }
}

export function validateProgram(program: ArchitectureProgram): void {
  if (!ARCHETYPES.includes(program.archetype)) throw new GrammarError("unknown-archetype", String(program.archetype));
  if (!Number.isInteger(program.seed) || program.seed < 0) throw new GrammarError("bad-param", `seed must be a non-negative integer, got ${program.seed}`);
  for (const call of program.rules) {
    const rule = ruleById(call.rule);
    if (!rule) throw new GrammarError("unknown-rule", call.rule);
    validateParams(rule, call.params);
  }
}

export function validateCall(nodes: readonly SpaceNode[], call: RuleCall): { rule: GrammarRule; target: SpaceNode } {
  const rule = ruleById(call.rule);
  if (!rule) throw new GrammarError("unknown-rule", call.rule);
  const target = nodes.find((n) => n.id === call.target);
  if (!target) throw new GrammarError("unknown-target", `${call.rule} → ${call.target}`);
  if (target.kind !== rule.accepts) throw new GrammarError("incompatible-target", `${rule.id} accepts ${rule.accepts}, ${target.id} is ${target.kind}`);
  if (target.depth >= rule.maxDepth) throw new GrammarError("depth-exceeded", `${rule.id} on ${target.id} at depth ${target.depth} (max ${rule.maxDepth})`);
  validateParams(rule, call.params);
  return { rule, target };
}

export function checkBudget(current: number, added: number, budget: number, what: string): void {
  if (current + added > budget) throw new GrammarError("budget-exceeded", `${what} would make ${current + added} nodes (budget ${budget})`);
}

function containmentParents(nodes: readonly SpaceNode[], edges: readonly SpaceEdge[]): Map<string, string[]> {
  const parents = new Map<string, string[]>();
  const link = (child: string, parent: string) => parents.set(child, [...(parents.get(child) ?? []), parent]);
  for (const n of nodes) if (n.parent) link(n.id, n.parent);
  for (const e of edges) if (e.relation === "contains") link(e.to, e.from);
  return parents;
}

export function validateGraph(graph: Pick<SpaceGraph, "nodes" | "edges">): void {
  const ids = new Set(graph.nodes.map((n) => n.id));
  for (const n of graph.nodes) if (n.parent && !ids.has(n.parent)) throw new GrammarError("dangling-edge", `${n.id}.parent → ${n.parent}`);
  for (const e of graph.edges) if (!ids.has(e.from) || !ids.has(e.to)) throw new GrammarError("dangling-edge", `${e.from} ${e.relation} ${e.to}`);
  const parents = containmentParents(graph.nodes, graph.edges);
  const state = new Map<string, 1 | 2>();
  const visit = (id: string, path: string[]): void => {
    if (state.get(id) === 2) return;
    if (state.get(id) === 1) throw new GrammarError("containment-cycle", [...path.slice(path.indexOf(id)), id].join(" ⊂ "));
    state.set(id, 1);
    for (const p of parents.get(id) ?? []) visit(p, [...path, id]);
    state.set(id, 2);
  };
  for (const id of ids) visit(id, []);
}
