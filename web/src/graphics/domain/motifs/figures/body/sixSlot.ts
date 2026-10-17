import { MOTIFS } from "../index.ts";
import { validateBody } from "./validate.ts";
import { SIX_SLOT_ALONE, SIX_SLOT_PLAN, SIX_SLOT_ROLE, type SixSlot } from "./tuning.ts";
import type { BodyGraph, PartEdge, PartNode } from "./types.ts";

export const SIX_SLOT_ROOT = "pivote";

/** The old fixed body plan as one program of the part graph: a pivot at the feet and one edge per declared slot. */
export function sixSlotGraph(parts: Partial<Record<SixSlot, string>>): BodyGraph {
  const present = SIX_SLOT_PLAN.filter((s) => parts[s.part] && MOTIFS[parts[s.part]!]);
  const alone = present.length === 1;
  const root: PartNode = { id: SIX_SLOT_ROOT, kind: { primitive: "pivot" }, role: "enclosure", scale: 1, depth: 0 };
  const nodes: PartNode[] = [root];
  const edges: PartEdge[] = [];
  for (const slot of present) {
    const motif = MOTIFS[parts[slot.part]!];
    nodes.push({ id: slot.part, kind: { motif: motif.id }, role: SIX_SLOT_ROLE[slot.part] ?? motif.role, scale: alone ? SIX_SLOT_ALONE.size : slot.size, depth: 1 });
    const pair = slot.pair !== undefined && !alone;
    const flip = slot.pair !== undefined && alone;
    const offset = alone ? [0, SIX_SLOT_ALONE.dy] as const : [pair ? slot.pair! : slot.dx, slot.dy] as const;
    edges.push({ from: root.id, socket: "center", to: slot.part, joint: "center", offset, ...(pair ? { mirror: true } : {}), ...(flip ? { flip: true } : {}) });
  }
  const graph: BodyGraph = { family: "seis-ranuras", root: root.id, fit: "pivot", nodes, edges, applied: [], fallbacks: [] };
  validateBody(graph);
  return graph;
}
