import { GrammarError, type SpaceGraph, type SpaceKind, type TopologyGoal, type TopologyMeasure } from "./types.ts";

const CIRCULATION = new Set(["connects", "faces", "bridges"]);

const BUILDINGS: readonly SpaceKind[] = ["building", "tower", "hall", "sanctuary", "shrine", "altar"];

const ELEVATING: readonly SpaceKind[] = ["platform"];

function circulation(graph: Pick<SpaceGraph, "nodes" | "edges">): Map<string, Set<string>> {
  const adj = new Map(graph.nodes.map((n) => [n.id, new Set<string>()]));
  for (const e of graph.edges) {
    if (!CIRCULATION.has(e.relation) || e.from === e.to) continue;
    adj.get(e.from)?.add(e.to);
    adj.get(e.to)?.add(e.from);
  }
  return adj;
}

function components(adj: Map<string, Set<string>>): number {
  const seen = new Set<string>();
  let n = 0;
  for (const id of adj.keys()) {
    if (seen.has(id)) continue;
    n++;
    const stack = [id];
    while (stack.length) {
      const k = stack.pop()!;
      if (seen.has(k)) continue;
      seen.add(k);
      stack.push(...adj.get(k)!);
    }
  }
  return n;
}

function elevations(graph: Pick<SpaceGraph, "nodes" | "edges">): Set<number> {
  const byId = new Map(graph.nodes.map((n) => [n.id, n]));
  const below = new Map(graph.edges.filter((e) => e.relation === "above").map((e) => [e.from, e.to]));
  const memo = new Map<string, number>();
  const level = (id: string): number => {
    const known = memo.get(id);
    if (known !== undefined) return known;
    const n = byId.get(id)!;
    const under = below.get(id);
    const parent = n.parent ? byId.get(n.parent) : undefined;
    const value = under ? level(under) + 1 : parent ? level(parent.id) + (ELEVATING.includes(parent.kind) ? 1 : 0) : 0;
    memo.set(id, value);
    return value;
  };
  return new Set(graph.nodes.map((n) => level(n.id)));
}

/** Measured on the final graph: branch nodes have ≥3 circulation neighbours, cycles is the cyclomatic number of circulation, buildings are independent when no circulation joins them to another building. */
export function measureTopology(graph: Pick<SpaceGraph, "nodes" | "edges">): TopologyMeasure {
  const adj = circulation(graph);
  const edges = [...adj.values()].reduce((s, set) => s + set.size, 0) / 2;
  const kind = new Map(graph.nodes.map((n) => [n.id, n.kind]));
  const isBuilding = (id: string) => BUILDINGS.includes(kind.get(id)!);
  return {
    branchNodes: [...adj.values()].filter((s) => s.size >= 3).length,
    cycles: edges - adj.size + components(adj),
    independentBuildings: graph.nodes.filter((n) => isBuilding(n.id) && ![...adj.get(n.id)!].some(isBuilding)).length,
    elevationLevels: elevations(graph).size,
  };
}

export function mergeGoals(goals: readonly (TopologyGoal | undefined)[]): TopologyGoal {
  const out: TopologyGoal = {};
  for (const g of goals) for (const [k, v] of Object.entries(g ?? {}) as [keyof TopologyGoal, number][]) out[k] = Math.max(out[k] ?? 0, v);
  return out;
}

const NAMES: Record<keyof TopologyGoal, [keyof TopologyMeasure, string]> = {
  minBranchNodes: ["branchNodes", "nodos de ramificación"],
  minCycles: ["cycles", "ciclos"],
  minIndependentBuildings: ["independentBuildings", "edificios independientes"],
  minElevationLevels: ["elevationLevels", "niveles de elevación"],
};

export function unmetGoal(measure: TopologyMeasure, goal: TopologyGoal): string[] {
  return (Object.entries(goal) as [keyof TopologyGoal, number][]).flatMap(([k, min]) => {
    const [field, name] = NAMES[k];
    return measure[field] < min ? [`${name} ${measure[field]} < ${min}`] : [];
  });
}

export function assertGoal(graph: Pick<SpaceGraph, "nodes" | "edges">, goal: TopologyGoal): TopologyMeasure {
  const measure = measureTopology(graph);
  const unmet = unmetGoal(measure, goal);
  if (unmet.length) throw new GrammarError("topology-goal", unmet.join(", "));
  return measure;
}
