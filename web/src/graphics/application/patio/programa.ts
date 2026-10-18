import { MORPH_POLICY } from "../../config/morph.ts";
import type { Group } from "../../config/scene.ts";
import { compileProgram, fromSixSlot } from "../../domain/motifs/figures/body/program/compile.ts";
import type { CompiledCreature } from "../../domain/motifs/figures/body/program/types.ts";
import { BodyGraphError } from "../../domain/motifs/figures/body/types.ts";

export type GroupCreature = { compiled: CompiledCreature; label: string };

const partsLabel = (g: Group) => Object.entries(g.creature.parts).map(([k, v]) => `${k}=${v}`).join(" ");

/** The group's CreatureProgram if it compiles; otherwise its six-slot parts, with the rejection said in the provenance. */
export function creatureOf(g: Group): GroupCreature {
  const legacy = () => compileProgram(fromSixSlot(g.creature.parts));
  if (g.programRejected) return { compiled: legacy(), label: `${partsLabel(g)}; programa descartado: ${g.programRejected}` };
  if (!g.program) return { compiled: legacy(), label: partsLabel(g) };
  try {
    const compiled = compileProgram(g.program, MORPH_POLICY);
    const ops = compiled.trace.map((t) => `${t.op} ${t.socket}${t.morph ? ` (${t.morph})` : ""}`).join(", ");
    return { compiled, label: `programa ${g.program.family}#${g.program.seed}${ops ? `: ${ops}` : ""}` };
  } catch (err) {
    if (!(err instanceof BodyGraphError)) throw err;
    return { compiled: legacy(), label: `${partsLabel(g)}; programa descartado: ${err.message}` };
  }
}
