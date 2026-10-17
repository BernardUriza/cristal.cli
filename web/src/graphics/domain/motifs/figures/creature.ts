import type { Rng } from "../../../../shared/rng";
import type { Shape } from "../../shapes.ts";
import { MOTIFS } from "./index.ts";
import { renamePart, type Part, type StructuralRole } from "./parts.ts";
import type { MotifParams, Provenance } from "./types.ts";

export type CreatureParts = Partial<Record<"cabeza" | "ojos" | "cuerpo" | "manos" | "cola" | "pies", string>>;

type Slot = { part: keyof CreatureParts; dx: number; dy: number; size: number; mirror?: boolean; pair?: number };

const BODY_PLAN: Slot[] = [
  { part: "cola", dx: 0.34, dy: -0.32, size: 0.32 },
  { part: "pies", dx: 0, dy: -0.08, size: 0.2, pair: 0.14 },
  { part: "cuerpo", dx: 0, dy: -0.42, size: 0.55 },
  { part: "manos", dx: 0.36, dy: -0.5, size: 0.24, pair: 0.36 },
  { part: "cabeza", dx: 0, dy: -0.86, size: 0.36 },
  { part: "ojos", dx: 0, dy: -0.9, size: 0.12, pair: 0.08 },
];

const ALONE_SIZE = 0.9;

const SLOT_ROLE: Partial<Record<keyof CreatureParts, StructuralRole>> = { cuerpo: "enclosure", cabeza: "crown", pies: "support", manos: "span" };

export type CreaturePiece = { slot: keyof CreatureParts; part: Part; shapes: Shape[] };

export function drawCreature(parts: CreatureParts, footX: number, footY: number, heightPx: number, params: Omit<MotifParams, "size">, rng: Rng): { shapes: Shape[]; pieces: CreaturePiece[]; provenance: Provenance } {
  const present = BODY_PLAN.filter((s) => parts[s.part] && MOTIFS[parts[s.part]!]);
  const alone = present.length === 1;
  const pieces: CreaturePiece[] = [];
  const used: string[] = [];
  for (const slot of present) {
    const motif = MOTIFS[parts[slot.part]!];
    const size = heightPx * (alone ? ALONE_SIZE : slot.size);
    const cy = footY + heightPx * (alone ? -0.5 : slot.dy);
    const xs = slot.pair !== undefined && !alone ? [-slot.pair, slot.pair] : [alone ? 0 : slot.dx];
    xs.forEach((dx, i) => {
      const mirror = slot.pair !== undefined && i === 0;
      const mp = { ...params, size, mirror };
      const root = motif.parts(footX + heightPx * dx, cy, mp);
      const part = { ...renamePart(root, `${slot.part}${xs.length > 1 ? i + 1 : ""}:${motif.id}`), role: SLOT_ROLE[slot.part] ?? root.role };
      pieces.push({ slot: slot.part, part, shapes: motif.draw(footX + heightPx * dx, cy, mp, rng).shapes });
    });
    used.push(`${slot.part}=${motif.id}${xs.length > 1 ? "×2" : ""}`);
  }
  return {
    shapes: pieces.flatMap((p) => p.shapes),
    pieces,
    provenance: {
      algorithm: "criatura compuesta: plan corporal fijo (cabeza, ojos, cuerpo, manos, cola, pies) con motivos Bézier propios en cada parte",
      params: { partes: used.join(", "), altura_px: Math.round(heightPx) },
      decision: alone ? "una sola parte: el motivo entero es la figura" : "cada parte declarada ocupa su lugar del plan corporal; las pares van en espejo",
    },
  };
}
