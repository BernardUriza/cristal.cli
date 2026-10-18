import type { BodyPart } from "../graphics/config/scene.ts";
import type { BodyFamily } from "../graphics/domain/motifs/figures/body/types.ts";

export type FamilyRule = { match: RegExp; family: BodyFamily; because: string };

/** Read on the word that named the group: the strongest clue, tried first. */
export const OWN_WORD_RULES: FamilyRule[] = [
  { match: /perros?|xolos?|lobos?|jaguar(?:es)?|gatos?|tigres?|felinos?|caballos?|venados?|coyotes?|animales?/i, family: "quadruped", because: "animal nombrado: cuadrúpedo" },
  { match: /monjes?|sacerdotes?|guardi[aá]n(?:es)?|guardias?|centinelas?|personas?|gente|hombres?|mujeres?|ni[nñ]os?|peregrinos?|almas?|humanos?|robots?|aut[oó]matas?|androides?|cyborgs?|calacas?|esqueletos?|muertos?|catrinas?/i, family: "biped", because: "gente que camina: bípedo" },
  { match: /serpientes?|r[ií]os?|sirenas?|peces?/i, family: "serpentine", because: "cuerpo que ondula: serpentino" },
  { match: /ojos?|soles?|flor(?:es)?/i, family: "radial", because: "forma que irradia: radial" },
  { match: /quimeras?|bestias?|monstruos?|criaturas?|seres?/i, family: "chimera", because: "ser sin cuerpo claro: quimera" },
];

/** A group made of this many distinct declared materials, with no body named, is a chimera. */
export const MIXTURE_RULE = { minMaterials: 2, family: "chimera" as BodyFamily, because: "mezcla de motivos sin cuerpo claro: quimera" };

/** Read on the whole narration, after the group's own word: clues of the scene, never words that name another group. */
export const NARRATION_RULES: FamilyRule[] = [
  { match: /procesi[oó]n|desfil|peregrin|marchan|caminan|gente|multitud/i, family: "biped", because: "la escena camina: bípedo" },
  { match: /serpientes?|r[ií]os?|serpente|ondula/i, family: "serpentine", because: "la escena ondula: serpentino" },
  { match: /\bsol(?:es)?\b|flor(?:es)?|irradia/i, family: "radial", because: "la escena irradia: radial" },
];

/** Where each declared part lands on a family body. */
export const PART_SOCKETS: Array<[BodyPart, string]> = [["cuerpo", "torso"], ["cabeza", "head"], ["manos", "hand"], ["pies", "foot"], ["ojos", "eye"], ["cola", "tail"]];
