import type { Rng } from "../../../../shared/rng";
import type { MorphPolicy } from "../../../config/morph.ts";
import type { DetailChoice } from "../../lod.ts";
import type { Shape } from "../../shapes.ts";
import { compileProgram, fromSixSlot } from "./body/program/compile.ts";
import type { ArchGrammar, CompiledCreature, CreatureProgram } from "./body/program/types.ts";
import { resolveBody, type EdgeTrace } from "./body/resolve.ts";
import type { SixSlot } from "./body/tuning.ts";
import type { Part } from "./parts.ts";
import type { MotifParams, Provenance } from "./types.ts";

export type CreatureParts = Partial<Record<SixSlot, string>>;

export type CreaturePiece = { slot: string; part: Part; shapes: Shape[]; grammar?: ArchGrammar; lod?: DetailChoice };

export type DrawnCreature = { shapes: Shape[]; pieces: CreaturePiece[]; provenance: Provenance; edges: EdgeTrace[] };

function legacyProvenance(c: CompiledCreature, heightPx: number): Provenance {
  const kinds = new Map(c.graph.nodes.map((n) => [n.id, "motif" in n.kind ? n.kind.motif : n.kind.primitive]));
  const count = new Map<string, number>();
  for (const e of c.graph.edges) {
    const key = `${e.to.replace(/-\d+$/, "")}=${kinds.get(e.to)}`;
    count.set(key, (count.get(key) ?? 0) + (e.mirror ? 2 : 1));
  }
  const used = [...count].map(([k, n]) => `${k}${n > 1 ? `×${n}` : ""}`);
  const joined = c.graph.fit === "bounds";
  return {
    algorithm: "criatura compuesta: plan corporal fijo (cabeza, ojos, cuerpo, manos, cola, pies) con motivos Bézier propios en cada parte",
    params: { partes: used.join(", "), altura_px: Math.round(heightPx) },
    decision: c.graph.edges.length === 1 ? "una sola parte: el motivo entero es la figura" : joined ? "cada parte se cuelga del tronco (cuerpo, si no la cabeza) por contactos en su silueta con solape declarado: una sola masa conectada; las pares en espejo" : "sin cuerpo ni cabeza: cada parte ocupa su lugar del plan corporal; las pares van en espejo",
  };
}

function programProvenance(c: CompiledCreature, pieces: number, heightPx: number): Provenance {
  return {
    algorithm: "CreatureProgram: familia del grafo de partes con sockets semánticos, operaciones replace/graft/repeat/architecturalize/blend/caricature aplicadas en orden y validadas (profundidad, sockets, presupuesto, contorno sin autocruce)",
    params: { familia: c.program.family, semilla: c.program.seed, operaciones: c.trace.length, piezas: pieces, altura_px: Math.round(heightPx) },
    decision: c.trace.map((t) => `${t.index}. ${t.op} ${t.socket}: ${t.detail} [${t.targets.join(",")}${t.added.length ? ` +${t.added.length}` : ""}${t.removed.length ? ` −${t.removed.length}` : ""}]${t.morph ? ` {${t.morph}}` : ""}`).join("; ") || `${c.program.family} sin operaciones`,
  };
}

export function drawCompiled(c: CompiledCreature, footX: number, footY: number, heightPx: number, params: Omit<MotifParams, "size">, rng: Rng): DrawnCreature {
  const body = resolveBody(c.graph, footX, footY, heightPx, params, rng);
  const legacy = c.program.family === "seis-ranuras" && c.trace.length === 0;
  return {
    shapes: body.shapes,
    pieces: body.pieces.map((p) => ({ slot: p.node, part: p.part, shapes: p.shapes, ...(c.grammars[p.node] ? { grammar: c.grammars[p.node] } : {}), ...(p.lod ? { lod: p.lod } : {}) })),
    edges: body.edges,
    provenance: legacy ? legacyProvenance(c, heightPx) : programProvenance(c, body.pieces.length, heightPx),
  };
}

export function drawProgram(program: CreatureProgram, footX: number, footY: number, heightPx: number, params: Omit<MotifParams, "size">, rng: Rng, morph?: MorphPolicy): DrawnCreature {
  return drawCompiled(compileProgram(program, morph), footX, footY, heightPx, params, rng);
}

export function drawCreature(parts: CreatureParts, footX: number, footY: number, heightPx: number, params: Omit<MotifParams, "size">, rng: Rng): DrawnCreature {
  return drawProgram(fromSixSlot(parts), footX, footY, heightPx, params, rng);
}
