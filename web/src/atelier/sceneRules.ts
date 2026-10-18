import type { Arrangement, ArchitectureSpec, BodyPart, Place, SceneMotif } from "../graphics/config/scene.ts";
import type { BodyFamily } from "../graphics/domain/motifs/figures/body/types.ts";
import { FAMILY_TEMPLATES } from "./creatureWords.ts";

export const NUMBER_WORDS: Record<string, number> = {
  un: 1, una: 1, uno: 1, dos: 2, tres: 3, cuatro: 4, cinco: 5, seis: 6, siete: 7, ocho: 8, nueve: 9, diez: 10,
  once: 11, doce: 12, trece: 13, catorce: 14, quince: 15, veinte: 20, docena: 12, cientos: 24, miles: 24, muchos: 12, muchas: 12,
};

/** A collective noun with no number of its own: the group is plural, its size seeded inside `range`. */
export const COLLECTIVE_NOUNS: { match: RegExp; range: readonly [number, number] }[] = [
  { match: /^(?:procesi[oó]n|coro|cortejo|desfile|manada|comitiva|ronda)$/i, range: [7, 12] },
  { match: /^(?:multitud|ej[eé]rcito|enjambre|legi[oó]n|horda)$/i, range: [12, 24] },
];

/** A size word right after a named figure is that figure's size, not another figure: «un jaguar gigante» is one jaguar, the protagonist. */
export const SIZE_WORDS: { match: RegExp; scale: number; because: string }[] = [
  { match: /^(?:gigantes?|enormes?|colosal(?:es)?|inmens[oa]s?|descomunal(?:es)?)$/i, scale: 1.8, because: "protagonista a escala 1.8" },
];

/** A size word right after a place noun («patio pequeño») sizes that place; `muy` in between is read through. */
export const PLACE_SIZE_WORDS: { match: RegExp; size: "grande" | "chico" }[] = [
  { match: /^(?:grandes?|enormes?|gigantes?|inmens[oa]s?|vast[oa]s?|ampli[oa]s?|grandios[oa]s?|colosal(?:es)?)$/i, size: "grande" },
  { match: /^(?:peque[nñ][oa]s?|chic[oa]s?|diminut[oa]s?|estrech[oa]s?|[ií]ntim[oa]s?|humildes?)$/i, size: "chico" },
];

export const COURTYARD_NOUNS = /^(?:patios?|recintos?|claustros?)$/i;

/** The materials of a group end where another figure enters with its own article or number, or a clause begins. */
export const MATERIAL_STOP = /\s(?:que|donde|cuando|mientras)\b|\s(?:a|al|y|e|con|ante|sobre|entre|hacia|junto a|frente a)\s+(?:un|una|unos|unas|el|la|los|las|dos|tres|cuatro|cinco|seis|siete|ocho|nueve|diez|\d+)\b/i;

/** The wall only puts its motifs in the patio when the narration brought no figure of its own. */
export const WALL_RULE = { onlyWithoutFigures: true, because: "la narración ya trae sus figuras: la pared no mete motivos que nadie nombró" } as const;

export type CreatureTemplate = { match: RegExp; name: string; parts: Partial<Record<BodyPart, SceneMotif>>; family?: BodyFamily };

export const CREATURE_TEMPLATES: CreatureTemplate[] = [
  ...FAMILY_TEMPLATES,
  { match: /robots?|aut[oó]matas?|androides?|m[aá]quinas?|cyborgs?|IA\b/i, name: "robot", parts: { cabeza: "craneo", ojos: "ojo", cuerpo: "escalera", manos: "mano" } },
  { match: /monjes?|sacerdotes?|guardianes?|guardias?|centinelas?/i, name: "guardián", parts: { cabeza: "mascara", ojos: "ojo", cuerpo: "escalera", manos: "mano" } },
  { match: /personas?|gente|hombres?|mujeres?|ni[nñ]os?|peregrinos?|almas?|humanos?/i, name: "persona", parts: { cabeza: "mascara", cuerpo: "sirena", manos: "mano" } },
  { match: /muertos?|esqueletos?|calacas?|catrinas?/i, name: "calaca", parts: { cabeza: "craneo", cuerpo: "escalera", manos: "mano", pies: "mano" } },
  { match: /bestias?|monstruos?|quimeras?|criaturas?|seres?/i, name: "quimera", parts: { cabeza: "jaguar", ojos: "ojo", cola: "sirena", pies: "mano" } },
  { match: /perros?|xolos?|lobos?/i, name: "perro", parts: { cuerpo: "perro" } },
  { match: /jaguar(?:es)?|gatos?|tigres?|felinos?/i, name: "jaguar", parts: { cuerpo: "jaguar" } },
  { match: /sirenas?|peces?/i, name: "sirena", parts: { cuerpo: "sirena" } },
  { match: /ojos?\b/i, name: "ojo", parts: { cuerpo: "ojo" } },
  { match: /manos?\b/i, name: "mano", parts: { cuerpo: "mano" } },
  { match: /cr[aá]neos?|calaveras?/i, name: "cráneo", parts: { cuerpo: "craneo" } },
  { match: /m[aá]scaras?|rostros?|caras?/i, name: "máscara", parts: { cuerpo: "mascara" } },
];

export const MATERIAL_WORDS: { match: RegExp; motif: SceneMotif; part: BodyPart }[] = [
  { match: /cr[aá]neos?|calaveras?/i, motif: "craneo", part: "cabeza" },
  { match: /m[aá]scaras?/i, motif: "mascara", part: "cabeza" },
  { match: /ojos?/i, motif: "ojo", part: "ojos" },
  { match: /manos?/i, motif: "mano", part: "manos" },
  { match: /escaleras?/i, motif: "escalera", part: "cuerpo" },
  { match: /escamas?|sirenas?/i, motif: "sirena", part: "cola" },
  { match: /jaguar(es)?/i, motif: "jaguar", part: "cuerpo" },
  { match: /perros?/i, motif: "perro", part: "cuerpo" },
];

export const ARRANGEMENT_RULES: { match: RegExp; arrangement: Arrangement; place?: Place; because: string }[] = [
  { match: /suben|subiendo|ascienden|escaleras? (infinit|sin fin)|trepan/i, arrangement: "escalera", place: "escalera", because: "suben: van en escalera" },
  { match: /\brode(?:a|an|ar|ando|aba|aban|aron|ó)\b|alrededor|c[ií]rculo|ronda|gir(?:a|an|ar|ando)\b/i, arrangement: "circulo", because: "rodean: van en círculo" },
  { match: /espiral|remolino|torbellino/i, arrangement: "espiral", because: "espiral" },
  { match: /desfil|procesi[oó]n|marchan|caminan|peregrin/i, arrangement: "procesion", because: "marchan: procesión" },
  { match: /ej[eé]rcito|filas|formados|cuadr[ií]cula|reticula/i, arrangement: "reticula", because: "formados: retícula" },
  { match: /corona|coronan/i, arrangement: "corona", place: "torres", because: "coronan: en las torres" },
];

export const PLACE_RULES: { match: RegExp; place: Place; because: string }[] = [
  { match: /flot|vuelan|cielo|nubes|levitan/i, place: "cielo", because: "flotan: en el cielo" },
  { match: /torres?|cima|c[uú]spide|vigilan desde/i, place: "torres", because: "en las torres" },
  { match: /techos?|azoteas?|tejados?/i, place: "azoteas", because: "en las azoteas" },
];

export const ARCHITECTURE_RULES: { match: RegExp; field: keyof ArchitectureSpec; value: string; because: string }[] = [
  { match: /enorme|gigante|inmens|ciudad|imperio|poder|catedral/i, field: "courtyard", value: "grande", because: "algo enorme: patio grande" },
  { match: /peque[nñ]|capilla|ermita|[ií]ntim|celda/i, field: "courtyard", value: "chico", because: "algo pequeño: patio chico" },
  { match: /infinit|vertigin|rascacielos|alt[ií]sim|hasta el cielo|al cielo/i, field: "heights", value: "vertiginoso", because: "hacia arriba: torres vertiginosas" },
  { match: /alt[oa]s?\b|elevad/i, field: "heights", value: "alto", because: "alto" },
  { match: /bajo|hundid|subterr|enterrad/i, field: "heights", value: "bajo", because: "bajo" },
  { match: /largo|alargad|avenida|corredor|pasillo/i, field: "footprint", value: "alargado", because: "largo: planta alargada" },
  { match: /profund|fondo|abismo/i, field: "footprint", value: "profundo", because: "profundo: planta profunda" },
];
