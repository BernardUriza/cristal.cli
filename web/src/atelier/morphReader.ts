import { MORPH_POLICY } from "../graphics/config/morph.ts";
import { SCENE_LIMITS, type Group } from "../graphics/config/scene.ts";
import { compileProgram, fromSixSlot } from "../graphics/domain/motifs/figures/body/program/compile.ts";
import { PROGRAM_LIMITS, type CompiledCreature, type CreatureOp, type CreatureProgram } from "../graphics/domain/motifs/figures/body/program/types.ts";
import { CARICATURE_WORDS, HALF_SCALE, HALF_WEIGHTS, HALF_WORD, motifOfWord } from "./morphWords.ts";

const compiled = (p: CreatureProgram): CompiledCreature | null => {
  if (p.operations.length > PROGRAM_LIMITS.operations) return null;
  try {
    return compileProgram(p, MORPH_POLICY);
  } catch {
    return null;
  }
};

/** A motif counts as present when a group is made of it or blends it in: the hybrid's partner is not summoned again. */
export const usesMotif = (g: Group, motif: string): boolean =>
  Object.values(g.creature.parts).includes(motif as never) || Boolean(g.program?.operations.some((o) => o.op === "blend" && o.motif === motif));

const nearestBefore = (at: number[], index: number): number => at.reduce((best, idx, i) => (idx <= index && (best < 0 || idx >= at[best]) ? i : best), -1);

/** Tries each candidate on the group's own program (its six parts if none), then on the declared body; the first that compiles wins and its morph note is said. */
function apply(groups: Group[], gi: number, candidates: CreatureOp[][], because: string, found: string, body?: Group["creature"]["parts"]): string {
  const g = groups[gi];
  const bases: Array<[CreatureProgram, Group]> = [[g.program ?? fromSixSlot(g.creature.parts), g]];
  if (body) bases.push([fromSixSlot(body), { ...g, creature: { ...g.creature, parts: body }, program: undefined }]);
  for (const [base, group] of bases) for (const ops of candidates) {
    const next = { ...base, operations: [...base.operations, ...ops] };
    const c = compiled(next);
    if (!c) continue;
    groups[gi] = { ...group, program: next };
    const notes = c.trace.slice(-ops.length).map((t) => t.morph).filter(Boolean);
    return `${g.creature.name}: ${because} (encontré «${found}»)${notes.length ? `; ${notes.join("; ")}` : ""}`;
  }
  return `${because}: no cabe en ${g.creature.name}, lo dejé fuera`;
}

function half(narration: string, groups: Group[], at: number[]): string | null {
  const m = HALF_WORD.exec(narration);
  const a = m && motifOfWord(m[1]), b = m && motifOfWord(m[2]);
  if (!m || !a || !b || a === b) return null;
  let gi = nearestBefore(at, m.index);
  if (gi < 0) {
    if (groups.length === SCENE_LIMITS.groups) return null;
    groups.push({ creature: { name: `${a}-${b}`, parts: { cuerpo: a } }, count: 1, arrangement: "fila", place: "patio", scale: HALF_SCALE });
    at.push(m.index);
    gi = groups.length - 1;
  }
  const ops: CreatureOp[] = [{ op: "replace", socket: "torso", motif: a }, ...HALF_WEIGHTS.map(([region, weight]): CreatureOp => ({ op: "blend", socket: "torso", motif: b, region, weight }))];
  return apply(groups, gi, [ops], `mitad ${a} mitad ${b}: cuerpo de ${a} con cola de ${b}`, m[0], { cuerpo: a });
}

function caricature(narration: string, groups: Group[], at: number[]): string | null {
  for (const w of CARICATURE_WORDS) {
    const m = w.match.exec(narration);
    if (!m) continue;
    const gi = groups.length ? Math.max(0, nearestBefore(at, m.index)) : -1;
    if (gi < 0) return `${w.because}: no nombraste a quién, lo dejé fuera`;
    return apply(groups, gi, ["torso", "head"].map((socket) => [{ op: "caricature", socket, k: w.k }]), w.because, m[0]);
  }
  return null;
}

/** Declared hybrid and caricature words become blend/caricature operations on the creature they name. */
export function morphWords(narration: string, groups: Group[], at: number[]): string[] {
  return [half(narration, groups, at), caricature(narration, groups, at)].filter((s): s is string => Boolean(s));
}
