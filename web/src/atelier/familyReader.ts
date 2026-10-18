import { MORPH_POLICY } from "../graphics/config/morph.ts";
import type { Creature } from "../graphics/config/scene.ts";
import { compileProgram } from "../graphics/domain/motifs/figures/body/program/compile.ts";
import type { CreatureOp, CreatureProgram } from "../graphics/domain/motifs/figures/body/program/types.ts";
import type { BodyFamily } from "../graphics/domain/motifs/figures/body/types.ts";
import { fnv1a } from "../shared/rng";
import { MIXTURE_RULE, NARRATION_RULES, OWN_WORD_RULES, PART_SOCKETS } from "./familyRules.ts";

const BODY_SEED_TRIES = 6;

export type FamilyClue = { family: BodyFamily; word: string; because: string; scope: "grupo" | "narración" };

export type FamilyChoice = FamilyClue & { repeated: boolean; skipped: BodyFamily[] };

export const FAMILY_NAMES: Record<BodyFamily, string> = { biped: "bípedo", quadruped: "cuadrúpedo", serpentine: "serpentino", radial: "radial", chimera: "quimera" };

/** Every family the words allow for one group, strongest first: its own word, its mixture of materials, then the narration. */
export function familyClues(word: string, materials: number, narration: string, isObject: boolean): FamilyClue[] {
  const clues: FamilyClue[] = [];
  for (const r of OWN_WORD_RULES) {
    const m = r.match.exec(word);
    if (m) clues.push({ family: r.family, word: m[0], because: r.because, scope: "grupo" });
  }
  if (!clues.length && materials >= MIXTURE_RULE.minMaterials) clues.push({ family: MIXTURE_RULE.family, word: `${materials} materiales`, because: MIXTURE_RULE.because, scope: "grupo" });
  if (isObject) return clues;
  for (const r of NARRATION_RULES) {
    const m = r.match.exec(narration);
    if (m) clues.push({ family: r.family, word: m[0], because: r.because, scope: "narración" });
  }
  return clues;
}

/** The first clue whose family no earlier group took; if the narration allows none, the strongest clue repeats. */
export function chooseFamily(clues: readonly FamilyClue[], used: ReadonlySet<BodyFamily>): FamilyChoice | null {
  if (!clues.length) return null;
  const fresh = clues.find((c) => !used.has(c.family));
  const pick = fresh ?? clues[0];
  const skipped = [...new Set(clues.slice(0, clues.indexOf(pick)).map((c) => c.family))].filter((f) => f !== pick.family);
  return { ...pick, repeated: !fresh, skipped };
}

export function sayFamily(c: FamilyChoice): string {
  const where = c.scope === "narración" ? " en la narración" : "";
  const skip = c.skipped.length ? `; no repito ${c.skipped.map((f) => FAMILY_NAMES[f]).join(" ni ")} de otro grupo` : "";
  const again = c.repeated ? "; repito familia: la narración no da otra" : "";
  return `familia ${FAMILY_NAMES[c.family]} (encontré «${c.word.trim()}»${where}: ${c.because})${skip}${again}`;
}

const fits = (p: CreatureProgram): boolean => {
  try {
    compileProgram(p, MORPH_POLICY);
    return true;
  } catch {
    return false;
  }
};

/** The family body with each declared part replaced on its socket; a part the body has no socket for is left out. */
function withParts(base: CreatureProgram, parts: Creature["parts"]): CreatureProgram {
  const operations: CreatureOp[] = [];
  for (const [part, socket] of PART_SOCKETS) {
    const motif = parts[part];
    if (!motif) continue;
    const op: CreatureOp = { op: "replace", socket, motif };
    if (fits({ ...base, operations: [...operations, op] })) operations.push(op);
  }
  return { ...base, operations };
}

/** The family body with each declared part replaced on its socket; of a few seeds, the one whose body takes the most parts. */
export function bodyProgram(family: BodyFamily, narration: string, name: string, parts: Creature["parts"]): CreatureProgram | null {
  let best: CreatureProgram | null = null;
  for (let k = 0; k < BODY_SEED_TRIES; k++) {
    const base: CreatureProgram = { family, seed: fnv1a(`${family}:${name}:${narration.trim().toLowerCase()}:${k}`) % 100000, operations: [] };
    if (!fits(base)) continue;
    const p = withParts(base, parts);
    if (!best || p.operations.length > best.operations.length) best = p;
  }
  return best;
}
