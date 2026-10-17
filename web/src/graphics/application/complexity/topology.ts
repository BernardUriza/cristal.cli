import type { Plan } from "../../domain/architecture/plan.ts";
import { EXTERIOR, pairKey } from "../../domain/architecture/program.ts";
import { fnv1a } from "../../../shared/rng.ts";
import type { SpaceGraph } from "./types.ts";

const DIRECTED = new Set(["contains", "above"]);

export type GraphSource = Plan | SpaceGraph;

export function graphFromPlan(plan: Plan): SpaceGraph {
  const nodes = plan.spaces.filter((s) => s.id !== EXTERIOR).map((s) => ({ id: s.id, kind: s.kind }));
  const ids = new Set(nodes.map((n) => n.id));
  const relations = new Map<string, { from: string; to: string; relation: string }>();
  for (const wall of plan.walls) {
    if (!ids.has(wall.left) || !ids.has(wall.right)) continue;
    const key = pairKey(wall.left, wall.right);
    const kinds = wall.openings.map((o) => o.kind).sort();
    const relation = kinds.length > 0 ? kinds[kinds.length - 1] : "wall";
    const prior = relations.get(key);
    if (!prior || (prior.relation === "wall" && relation !== "wall")) relations.set(key, { from: wall.left, to: wall.right, relation });
  }
  return { nodes, edges: [...relations.values()] };
}

export function toSpaceGraph(source: GraphSource): SpaceGraph {
  if ("spaces" in source) return graphFromPlan(source);
  return { nodes: source.nodes.map((n) => ({ id: n.id, kind: n.kind })), edges: source.edges.map((e) => ({ from: e.from, to: e.to, relation: e.relation })) };
}

type Neighbor = { id: string; label: string };

function adjacency(graph: SpaceGraph): Map<string, Neighbor[]> {
  const adj = new Map<string, Neighbor[]>(graph.nodes.map((n) => [n.id, []]));
  for (const e of graph.edges) {
    const directed = DIRECTED.has(e.relation);
    adj.get(e.from)?.push({ id: e.to, label: directed ? `${e.relation}>` : e.relation });
    adj.get(e.to)?.push({ id: e.from, label: directed ? `${e.relation}<` : e.relation });
  }
  return adj;
}

function unfold(id: string, depth: number, from: string | null, adj: Map<string, Neighbor[]>, kinds: Map<string, string>): string {
  if (depth === 0) return kinds.get(id) ?? "?";
  const children = (adj.get(id) ?? []).filter((n) => n.id !== from).map((n) => `${n.label}:${unfold(n.id, depth - 1, id, adj, kinds)}`).sort();
  return `${kinds.get(id) ?? "?"}(${children.join(",")})`;
}

export function localSignatures(source: GraphSource): string[] {
  const graph = toSpaceGraph(source);
  const adj = adjacency(graph);
  const kinds = new Map(graph.nodes.map((n) => [n.id, n.kind]));
  return [...new Set(graph.nodes.map((n) => unfold(n.id, 2, null, adj, kinds)))].sort();
}

export function graphSignature(source: GraphSource): string {
  return fnv1a(localSignatures(source).join("|")).toString(16).padStart(8, "0");
}

export function topologicalDiversity(sources: readonly GraphSource[]): number {
  return new Set(sources.map(graphSignature)).size;
}
