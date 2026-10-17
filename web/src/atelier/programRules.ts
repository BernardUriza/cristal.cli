import type { Archetype } from "../graphics/domain/grammar/types.ts";

export type ArchetypeRule = { archetype: Archetype; match: RegExp; because: string };

export const ARCHETYPE_RULES: ArchetypeRule[] = [
  { archetype: "city", match: /ciudad(?:es)?|torres?\b|puentes?|rascacielos|avenidas?|calles?|metr[oó]poli/gi, because: "hablaste de una ciudad: torre, escalera y cámaras apiladas, y puentes desde la avenida hacia más torres (R3 → R4 → R4)" },
  { archetype: "palace", match: /palacios?|sal[oó]n(?:es)?|habitaci[oó]n(?:es)?|secret[oa]s?|c[aá]maras?|alcobas?|tronos?|poder/gi, because: "hablaste de un palacio: un salón con cámaras, galerías hacia un patio, y en el patio otro recinto (R2 → R6 → R5)" },
  { archetype: "temple", match: /templos?|patios?\b|santuarios?|claustros?|altar(?:es)?|monjes?|capillas?/gi, because: "hablaste de un templo: un patio rodeado de galerías y dentro de él otro patio con sus galerías (R1 → R5 → R1)" },
  { archetype: "labyrinth", match: /laberint\w*|pasillos?|perdid[oa]s?|pierden?|extravi\w*|corredor(?:es)?/gi, because: "hablaste de perderse: salones con cámaras que se abren dos veces en galerías y patios (R2 → R6 → R6)" },
];

export const DEFAULT_ARCHETYPE: Archetype = "temple";

export const DEFAULT_ARCHETYPE_BECAUSE = "no nombraste ningún lugar: el templo de patios sucesivos (R1 → R5 → R1)";

export type ParamSource = { key: string; nouns: RegExp };

export type Step = { rule: string; target: string; params: ParamSource[] };

const CHAMBERS = /habitaci|c[aá]mara|alcoba|cuarto|celda|sal[oó]n|sala/i;
const GALLERIES = /galer[ií]a|claustro|lado|arcada/i;
const SCALE = /patio|recinto|santuario/i;

export const SEQUENCES: Record<Archetype, Step[]> = {
  palace: [
    { rule: "R2", target: "root", params: [{ key: "chambers", nouns: CHAMBERS }] },
    { rule: "R6", target: "hall-1", params: [] },
    { rule: "R5", target: "courtyard-1", params: [{ key: "scale", nouns: SCALE }] },
  ],
  city: [
    { rule: "R3", target: "root", params: [{ key: "chambers", nouns: /piso|casa|c[aá]mara|habitaci/i }] },
    { rule: "R4", target: "gallery-1", params: [] },
  ],
  temple: [
    { rule: "R1", target: "root", params: [{ key: "galleries", nouns: GALLERIES }] },
    { rule: "R5", target: "courtyard-1", params: [{ key: "scale", nouns: SCALE }] },
    { rule: "R1", target: "complex-1", params: [{ key: "galleries", nouns: GALLERIES }] },
  ],
  labyrinth: [
    { rule: "R2", target: "root", params: [{ key: "chambers", nouns: CHAMBERS }] },
    { rule: "R6", target: "hall-1", params: [] },
    { rule: "R6", target: "hall-1", params: [] },
  ],
};

export const TOWER_NOUNS = /torres?|puentes?/i;

export const DEFAULT_BRIDGES = 3;

export const MAX_BRIDGES = 4;

export const BIG = /enorme|gigante|inmens|grandios|vast|sucesiv|infinit/i;

export const SMALL = /peque[nñ]|chic[oa]|[ií]ntim|humilde|diminut/i;
