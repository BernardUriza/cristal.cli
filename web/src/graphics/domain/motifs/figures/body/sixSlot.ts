import { MOTIFS } from "../index.ts";
import { joinSixSlots } from "./sixSlotJoin.ts";
import { validateBody } from "./validate.ts";
import { SIX_SLOT_ALONE, SIX_SLOT_PLAN, SIX_SLOT_ROLE, type SixSlot } from "./tuning.ts";
import type { BodyGraph, PartEdge, PartNode } from "./types.ts";

export const SIX_SLOT_ROOT = "pivote";

const ROOT: PartNode = { id: SIX_SLOT_ROOT, kind: { primitive: "pivot" }, role: "enclosure", scale: 1, depth: 0 };

/** A lone part, or pairs and tail with no body or head to hang on: the old fixed offsets around the pivot at the feet. */
export function looseGraph(parts: Partial<Record<SixSlot, string>>): BodyGraph {
  const present = SIX_SLOT_PLAN.filter((s) => parts[s.part] && MOTIFS[parts[s.part]!]);
  const alone = present.length === 1;
  const nodes: PartNode[] = [ROOT];
  const edges: PartEdge[] = [];
  for (const slot of present) {
    const motif = MOTIFS[parts[slot.part]!];
    nodes.push({ id: slot.part, kind: { motif: motif.id }, role: SIX_SLOT_ROLE[slot.part] ?? motif.role, scale: alone ? SIX_SLOT_ALONE.size : slot.size, depth: 1 });
    const pair = slot.pair !== undefined && !alone;
    const flip = slot.pair !== undefined && alone;
    const offset = alone ? [0, SIX_SLOT_ALONE.dy] as const : [pair ? slot.pair! : slot.dx, slot.dy] as const;
    edges.push({ from: ROOT.id, socket: "center", to: slot.part, joint: "center", offset, ...(pair ? { mirror: true } : {}), ...(flip ? { flip: true } : {}) });
  }
  return { family: "seis-ranuras", root: ROOT.id, fit: "pivot", nodes, edges, applied: [], fallbacks: [] };
}

/** The six-slot plan as one program of the part graph: every piece hung on the trunk's silhouette (see sixSlotJoin.ts), the whole fitted by its bounds so the feet touch the ground. */
export function sixSlotGraph(parts: Partial<Record<SixSlot, string>>): BodyGraph {
  const known = Object.fromEntries(Object.entries(parts).filter(([, m]) => m && MOTIFS[m])) as Partial<Record<SixSlot, string>>;
  const joined = Object.keys(known).length > 1 ? joinSixSlots(known) : undefined;
  const graph = joined
    ? {
        family: "seis-ranuras" as const,
        root: ROOT.id,
        fit: "bounds" as const,
        nodes: [ROOT, ...joined.map((p): PartNode => ({ id: p.id, kind: { motif: p.motif }, role: SIX_SLOT_ROLE[p.part] ?? MOTIFS[p.motif].role, scale: p.size, depth: 1 }))],
        edges: joined.map((p): PartEdge => ({ from: ROOT.id, socket: "center", to: p.id, joint: "center", offset: [p.flip ? -p.at[0] : p.at[0], p.at[1]], ...(p.flip ? { flip: true } : {}) })),
        applied: [],
        fallbacks: [],
      }
    : looseGraph(parts);
  validateBody(graph);
  return graph;
}
