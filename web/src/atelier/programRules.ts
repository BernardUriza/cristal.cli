import type { Archetype } from "../graphics/domain/grammar/types.ts";

export type ArchetypeRule = { archetype: Archetype; match: RegExp; because: string };

export const ARCHETYPE_RULES: ArchetypeRule[] = [
  { archetype: "city", match: /ciudad(?:es)?|torres?\b|puentes?|rascacielos|avenidas?|calles?|metr[oó]poli/gi, because: "hablaste de una ciudad" },
  { archetype: "palace", match: /palacios?|sal[oó]n(?:es)?|habitaci[oó]n(?:es)?|secret[oa]s?|c[aá]maras?|alcobas?|tronos?|poder/gi, because: "hablaste de un palacio: un salón con cámaras, galerías hacia un patio, y en el patio otro recinto (R2 → R6 → R5)" },
  { archetype: "temple", match: /templos?|patios?\b|santuarios?|claustros?|altar(?:es)?|monjes?|capillas?/gi, because: "hablaste de un templo" },
  { archetype: "labyrinth", match: /laberint\w*|pasillos?|perdid[oa]s?|pierden?|extravi\w*|corredor(?:es)?/gi, because: "hablaste de perderse: salones con cámaras que se abren dos veces en galerías y patios (R2 → R6 → R6)" },
];

export const DEFAULT_ARCHETYPE: Archetype = "temple";

export const DEFAULT_ARCHETYPE_BECAUSE = "no nombraste ningún lugar: un templo";

export type ParamSource = { key: string; nouns: RegExp; countOnly?: boolean };

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

export type Variant = { id: string; words: RegExp; steps: Step[]; because: string; bridges?: boolean };

export const VARIANTS: Partial<Record<Archetype, Variant[]>> = {
  temple: [
    { id: "patios", words: /patios?\b|claustros?|sucesiv\w*|galer[ií]as?/gi, steps: SEQUENCES.temple, because: "patios sucesivos: un patio rodeado de galerías y dentro otro patio con las suyas (R1 → R5 → R1)" },
    { id: "radial", words: /santuarios?|capillas?|altar(?:es)?|centro|rode\w*|alrededor|c[ií]rculos?|procesi[oó]n/gi, steps: [{ rule: "R7", target: "root", params: [{ key: "shrines", nouns: /capilla|altar|nicho|ermita/i, countOnly: true }] }], because: "templo radial: un santuario dentro de una galería anular, con capillas de formas distintas alrededor (R7)" },
    { id: "terrazas", words: /terrazas?|escaleras?|escalinatas?|pir[aá]mides?|cimas?|niveles?|suben?|ascien\w*/gi, steps: [{ rule: "R8", target: "root", params: [] }], because: "templo en terrazas: tres plataformas que se encogen hacia arriba, dos escaleras y el santuario en la cima (R8)" },
  ],
  city: [
    { id: "torres", words: /torres?\b|puentes?|rascacielos/gi, steps: SEQUENCES.city, bridges: true, because: "torres: torre, escalera y cámaras apiladas, y puentes desde la avenida hacia más torres (R3 → R4)" },
    { id: "manzanas", words: /manzanas?|cuadras?|plazas?|barrios?|casas?|mercados?|vecin\w*/gi, steps: [{ rule: "R9", target: "root", params: [{ key: "blocks", nouns: /manzana|cuadra|barrio/i, countOnly: true }, { key: "buildings", nouns: /casa|edificio/i, countOnly: true }] }], because: "manzanas: una plaza dentro de un anillo de calle, con manzanas de edificios sueltos alrededor (R9)" },
    { id: "ramal", words: /calles?|avenidas?|cruces?|esquinas?|caminos?|encrucijadas?|ramas?/gi, steps: [{ rule: "R10", target: "gallery-1", params: [] }, { rule: "R10", target: "street-1", params: [] }, { rule: "R3", target: "root", params: [] }], because: "ramal: la avenida se abre en un cruce de tres calles y una de ellas en otro cruce, con una torre aparte (R10 → R10 → R3)" },
  ],
};

export const WORD_WEIGHT = 3;

export const VARIANT_SALT = 0x51ab;

export const TOWER_NOUNS = /torres?|puentes?/i;

export const DEFAULT_BRIDGES = 3;

export const MAX_BRIDGES = 4;

export const BIG = /enorme|gigante|inmens|grandios|vast|sucesiv|infinit/i;

export const SMALL = /peque[nñ]|chic[oa]|[ií]ntim|humilde|diminut/i;
