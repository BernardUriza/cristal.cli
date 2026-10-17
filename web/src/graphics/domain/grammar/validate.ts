import { ruleById } from "./rules.ts";
import { ARCHETYPES, GrammarError, type ArchitectureProgram, type GrammarRule, type RuleCall, type SpaceEdge, type SpaceGraph, type SpaceNode } from "./types.ts";

const GOAL_KEYS = ["minBranchNodes", "minCycles", "minIndependentBuildings", "minElevationLevels"];

const MIN_JUNCTION_ANGLE = 45;

function validateJunctions(graph: Pick<SpaceGraph, "nodes" | "edges">): void {
  const byId = new Map(graph.nodes.map((n) => [n.id, n]));
  for (const j of graph.nodes.filter((n) => n.kind === "junction")) {
    const arms = graph.edges.filter((e) => e.relation === "connects" && e.to === j.id).map((e) => byId.get(e.from)!).filter((n) => n.heading !== undefined);
    const degree = graph.edges.filter((e) => e.relation === "connects" && (e.from === j.id || e.to === j.id)).length;
    if (degree < 3) throw new GrammarError("bad-junction", `${j.id} has degree ${degree} (min 3)`);
    for (let i = 1; i < arms.length; i++) {
      const gap = Math.abs(arms[i].heading! - arms[i - 1].heading!) % 360;
      if (Math.min(gap, 360 - gap) < MIN_JUNCTION_ANGLE) throw new GrammarError("bad-junction", `${arms[i - 1].id}∠${arms[i].id} < ${MIN_JUNCTION_ANGLE}°`);
    }
  }
}

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
  for (const [key, value] of Object.entries(program.goal ?? {})) {
    if (!GOAL_KEYS.includes(key) || !Number.isInteger(value) || value < 0) throw new GrammarError("bad-param", `goal.${key}=${String(value)}`);
  }
}

export function validateCall(nodes: readonly SpaceNode[], call: RuleCall): { rule: GrammarRule; target: SpaceNode } {
  const rule = ruleById(call.rule);
  if (!rule) throw new GrammarError("unknown-rule", call.rule);
  const target = nodes.find((n) => n.id === call.target);
  if (!target) throw new GrammarError("unknown-target", `${call.rule} → ${call.target}`);
  if (!rule.accepts.includes(target.kind)) throw new GrammarError("incompatible-target", `${rule.id} accepts ${rule.accepts.join("|")}, ${target.id} is ${target.kind}`);
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
  validateJunctions(graph);
}
