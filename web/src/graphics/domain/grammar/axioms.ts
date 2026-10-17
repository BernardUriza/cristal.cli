import type { Archetype, SpaceEdge, SpaceNode } from "./types.ts";

export const DEFAULT_BUDGET = 64;

export const ROOT_ID = "root";

const ROOT_FOOTPRINT: Record<Archetype, [number, number]> = {
  palace: [46, 34],
  city: [40, 40],
  temple: [40, 40],
  labyrinth: [44, 44],
};

export function axiom(archetype: Archetype): { nodes: SpaceNode[]; edges: SpaceEdge[] } {
  const root: SpaceNode = { id: ROOT_ID, kind: "complex", level: 0, footprint: ROOT_FOOTPRINT[archetype], style: archetype, depth: 0 };
  if (archetype !== "city") return { nodes: [root], edges: [] };
  const avenue: SpaceNode = { id: "gallery-1", kind: "gallery", parent: ROOT_ID, level: 0, footprint: [22, 3.5], style: archetype, depth: 1 };
  return { nodes: [root, avenue], edges: [{ from: ROOT_ID, to: avenue.id, relation: "contains" }] };
}

export const COMPLETION_BIAS: Record<Archetype, Record<string, number>> = {
  palace: { R1: 0.5, R2: 2, R3: 0.5, R7: 0, R8: 0, R9: 0 },
  city: { R1: 0.3, R2: 0.5, R3: 3, R7: 0, R8: 0, R9: 0 },
  temple: { R1: 3, R2: 0.5, R3: 0.3, R7: 0, R8: 0, R9: 0 },
  labyrinth: { R1: 0.5, R2: 3, R3: 0.3, R7: 0, R8: 0, R9: 0 },
};
