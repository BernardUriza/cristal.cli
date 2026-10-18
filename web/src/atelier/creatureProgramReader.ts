import { MORPH_POLICY } from "../graphics/config/morph.ts";
import { SCENE_LIMITS, type Group, type SceneMotif } from "../graphics/config/scene.ts";
import { compileProgram } from "../graphics/domain/motifs/figures/body/program/compile.ts";
import { PROGRAM_LIMITS, type CreatureProgram } from "../graphics/domain/motifs/figures/body/program/types.ts";
import type { BodyFamily } from "../graphics/domain/motifs/figures/body/types.ts";
import { fnv1a } from "../shared/rng";
import { OP_WORDS, OP_WORD_GROUP } from "./creatureWords.ts";
import { bodyProgram } from "./familyReader.ts";
import { MORPH_PATTERNS } from "./morphWords.ts";

const blank = (m: string) => " ".repeat(m.length);

/** The modifier words are not creatures: «cola de sirena» must not summon a mermaid group. Indices stay put. */
export function maskOpWords(text: string): string {
  return [...OP_WORDS.map((w) => w.match), ...MORPH_PATTERNS].reduce((t, re) => t.replace(new RegExp(re.source, "gi"), blank), text);
}

export function familyProgram(family: BodyFamily, narration: string, head?: SceneMotif): CreatureProgram {
  return { family, seed: fnv1a(`${family}:${narration.trim().toLowerCase()}`) % 100000, operations: head ? [{ op: "replace", socket: "head", motif: head }] : [] };
}

const compiles = (p: CreatureProgram): boolean => {
  try {
    compileProgram(p, MORPH_POLICY);
    return true;
  } catch {
    return false;
  }
};

/** Each declared modifier lands on the nearest creature named before it (or a new figure); an operation the body cannot take is dropped and said. */
export function programWords(narration: string, groups: Group[], at: number[], defaulted: ReadonlySet<number> = new Set()): string[] {
  const because: string[] = [];
  for (const w of OP_WORDS) {
    const m = w.match.exec(narration);
    if (!m) continue;
    let gi = at.reduce((best, idx, i) => (idx <= m.index && (best < 0 || idx >= at[best]) ? i : best), -1);
    if (gi < 0 && groups.length) gi = 0;
    if (gi < 0) {
      if (groups.length === SCENE_LIMITS.groups) continue;
      groups.push({ creature: { name: m[0].trim(), parts: OP_WORD_GROUP.parts }, count: 1, arrangement: "fila", place: "patio", scale: 1.6 });
      at.push(m.index);
      gi = groups.length - 1;
    }
    const g = groups[gi];
    const declared = (defaulted.has(gi) ? bodyProgram(w.family, narration, g.creature.name, g.creature.parts) : null) ?? familyProgram(w.family, narration, g.creature.parts.cabeza);
    const bases = g.program ? (defaulted.has(gi) ? [g.program, declared] : [g.program]) : [declared];
    const tries = bases.map((b) => ({ ...b, operations: [...b.operations, ...w.ops] }));
    const fit = tries.findIndex((p) => p.operations.length <= PROGRAM_LIMITS.operations && compiles(p));
    const base = bases[Math.max(0, fit)];
    const next = tries[Math.max(0, fit)];
    if (next.operations.length > PROGRAM_LIMITS.operations || !compiles(next)) {
      because.push(`${w.because}: no cabe en ${g.creature.name} (${base.family}), lo dejé fuera`);
      continue;
    }
    groups[gi] = { ...g, program: next };
    because.push(`${g.creature.name}: ${w.because} (encontré «${m[0].trim()}»)`);
  }
  return because;
}
