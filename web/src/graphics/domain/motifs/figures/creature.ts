import type { Rng } from "../../../../shared/rng";
import type { Shape } from "../../shapes.ts";
import { resolveBody, type EdgeTrace } from "./body/resolve.ts";
import { sixSlotGraph } from "./body/sixSlot.ts";
import type { SixSlot } from "./body/tuning.ts";
import type { Part } from "./parts.ts";
import type { MotifParams, Provenance } from "./types.ts";

export type CreatureParts = Partial<Record<SixSlot, string>>;

export type CreaturePiece = { slot: keyof CreatureParts; part: Part; shapes: Shape[] };

export function drawCreature(parts: CreatureParts, footX: number, footY: number, heightPx: number, params: Omit<MotifParams, "size">, rng: Rng): { shapes: Shape[]; pieces: CreaturePiece[]; provenance: Provenance; edges: EdgeTrace[] } {
  const graph = sixSlotGraph(parts);
  const body = resolveBody(graph, footX, footY, heightPx, params, rng);
  const kinds = new Map(graph.nodes.map((n) => [n.id, "motif" in n.kind ? n.kind.motif : n.kind.primitive]));
  const used = graph.edges.map((e) => `${e.to}=${kinds.get(e.to)}${e.mirror ? "×2" : ""}`);
  const alone = graph.edges.length === 1;
  return {
    shapes: body.shapes,
    pieces: body.pieces.map((p) => ({ slot: p.node as SixSlot, part: p.part, shapes: p.shapes })),
    edges: body.edges,
    provenance: {
      algorithm: "criatura compuesta: plan corporal fijo (cabeza, ojos, cuerpo, manos, cola, pies) con motivos Bézier propios en cada parte",
      params: { partes: used.join(", "), altura_px: Math.round(heightPx) },
      decision: alone ? "una sola parte: el motivo entero es la figura" : "cada parte declarada ocupa su lugar del plan corporal; las pares van en espejo",
    },
  };
}
