import type { SceneMotif } from "../graphics/config/scene.ts";
import type { Region } from "../graphics/domain/motifs/figures/regions.ts";

const MOTIF_WORDS: Array<[string, SceneMotif]> = [
  ["jaguar(?:es)?", "jaguar"], ["perros?", "perro"], ["sirenas?", "sirena"], ["manos?", "mano"],
  ["ojos?", "ojo"], ["cr[aá]neos?", "craneo"], ["m[aá]scaras?", "mascara"], ["escaleras?", "escalera"],
];

const ANY = MOTIF_WORDS.map(([w]) => w).join("|");

export const HALF_WORD = new RegExp(`mitad (?:de )?(${ANY}),?(?: y)? mitad (?:de )?(${ANY})`, "i");

export const HALF_WEIGHTS: Array<[Region, number]> = [["punta", 1], ["extremidad", 0.3]];

export const HALF_SCALE = 1.8;

export type CaricatureWord = { match: RegExp; k: number; because: string };

export const CARICATURE_WORDS: CaricatureWord[] = [
  { match: /caricaturas? de/i, k: 1.8, because: "caricatura: exagero su silueta contra la norma de su familia" },
  { match: /muy exagerad[oa]s?/i, k: 2.2, because: "muy exagerado: k alto contra la norma de su familia" },
  { match: /exagerad[oa]s?/i, k: 1.6, because: "exagerado: exagero su silueta contra la norma de su familia" },
];

export const MORPH_PATTERNS: RegExp[] = [HALF_WORD, ...CARICATURE_WORDS.map((c) => c.match)];

export function motifOfWord(word: string): SceneMotif | undefined {
  return MOTIF_WORDS.find(([w]) => new RegExp(`^(?:${w})$`, "i").test(word))?.[1];
}
