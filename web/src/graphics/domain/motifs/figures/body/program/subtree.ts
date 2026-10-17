import type { BodyGraph, PartEdge, PartNode } from "../types.ts";

export type Graph = Pick<BodyGraph, "root" | "nodes" | "edges">;

export type Subtree = { nodes: PartNode[]; edges: PartEdge[] };

export function subtreeOf(g: Graph, id: string): Subtree {
  const ids = [id];
  for (let i = 0; i < ids.length; i++) for (const e of g.edges) if (e.from === ids[i]) ids.push(e.to);
  return { nodes: g.nodes.filter((n) => ids.indexOf(n.id) >= 0), edges: g.edges.filter((e) => ids.indexOf(e.from) >= 0) };
}

export const parentEdge = (g: Graph, id: string): PartEdge | undefined => g.edges.find((e) => e.to === id);

export function without(g: Graph, id: string): Graph {
  const gone = subtreeOf(g, id).nodes.map((n) => n.id);
  return { root: g.root, nodes: g.nodes.filter((n) => gone.indexOf(n.id) < 0), edges: g.edges.filter((e) => gone.indexOf(e.to) < 0) };
}

/** A copy of a subtree with every id renamed and its depth shifted so its root sits at `depth`. */
export function cloned(t: Subtree, rootId: string, rename: (id: string) => string, depth: number): Subtree {
  const base = t.nodes.find((n) => n.id === rootId)!.depth;
  return {
    nodes: t.nodes.map((n) => ({ ...n, id: rename(n.id), depth: n.depth - base + depth })),
    edges: t.edges.map((e) => ({ ...e, from: rename(e.from), to: rename(e.to) })),
  };
}
