import type { PaletteName } from "../graphics/config/palettes.ts";
import type { ProjectionKind, Symmetry } from "../graphics/config/types.ts";
import type { Scene } from "../graphics/config/scene.ts";
import type { Anomaly, Composition, MotifName, OrnamentLanguage } from "./vocabulary.ts";

export type Decision =
  | { field: "composition"; value: Composition }
  | { field: "scene"; value: Scene }
  | { field: "motifs"; value: MotifName[] }
  | { field: "ornament"; value: OrnamentLanguage[] }
  | { field: "anomaly"; value: Anomaly }
  | { field: "palette"; value: PaletteName }
  | { field: "symmetry"; value: Symmetry }
  | { field: "projection"; value: ProjectionKind }
  | { field: "complexity"; value: number }
  | { field: "density"; value: number }
  | { field: "anomalyRate"; value: number }
  | { field: "columns"; value: number };

export type DirectorRule = { match: RegExp; decision: Decision; because: string };

export type MotifRule = { match: RegExp; motif: MotifName; because: string };

export const MOTIF_RULES: MotifRule[] = [
  { match: /ojo|mirad|vigil|ve[rn] todo|observ/i, motif: "ojo", because: "hablaste de mirar: un ojo vigila" },
  { match: /mano|dedo|palma|toc[ao]r|agarr/i, motif: "mano", because: "hablaste de manos" },
  { match: /cr[aá]neo|calavera|muert|hueso|esquelet/i, motif: "craneo", because: "hablaste de la muerte: un cráneo" },
  { match: /perro|can|ladr|mascota/i, motif: "perro", because: "nombraste un perro" },
  { match: /jaguar|felino|gato|tigre|pantera|selva/i, motif: "jaguar", because: "nombraste un felino: un jaguar" },
  { match: /escalera|peldañ|subir|ascen/i, motif: "escalera", because: "hablaste de subir: una escalera" },
  { match: /m[aá]scara|rostro|cara|disfraz|teatro/i, motif: "mascara", because: "hablaste de rostros: una máscara" },
  { match: /sirena|mar|agua|pez|escama|nadar/i, motif: "sirena", because: "hablaste del agua: una sirena" },
];

export type OrnamentRule = { match: RegExp; language: OrnamentLanguage; because: string };

export const ORNAMENT_RULES: OrnamentRule[] = [
  { match: /greca|laberint|meandro|cenefa/i, language: "greca", because: "hablaste de laberintos: greca" },
  { match: /zigzag|chevr|diente|sierra|ray[ao]s/i, language: "chevrón", because: "hablaste de zigzag: chevrón" },
  { match: /ajedrez|tablero|cuadr[ií]cula|damero|mosaico/i, language: "ajedrez", because: "hablaste de tableros: ajedrez" },
  { match: /estr[ií]a|acanalad|l[ií]neas vertical|columna/i, language: "estrías", because: "hablaste de columnas: estrías" },
  { match: /roset|flor|p[eé]talo|sol\b|estrella/i, language: "roseta", because: "hablaste de flores o soles: rosetas" },
  { match: /tri[aá]ngul|fractal|sierpinski|infinit|recursiv/i, language: "sierpinski", because: "hablaste de infinito: Sierpinski" },
];

export const DEFAULT_ORNAMENT: OrnamentLanguage[] = ["greca", "ajedrez"];

export const DIRECTOR_RULES: DirectorRule[] = [
  { match: /patio|claustro|ciudad|edificio|torre|galer[ií]a|mapa|plano|desde arriba|axonom|isom[eé]tric|recorr/i, decision: { field: "composition", value: "patio" }, because: "hablaste de un lugar que se recorre: patio axonométrico con planta real" },
  { match: /templo|fachada|altar|capilla|columnas?/i, decision: { field: "composition", value: "templo" }, because: "hablaste de un templo: fachada en perspectiva" },
  { match: /escalera|peldañ|subir|bajar/i, decision: { field: "anomaly", value: "escalera-imposible" }, because: "nombraste una escalera: sube y desemboca donde no debería" },
  { match: /dentro de|anidad|adentro|contiene|recursiv|espejo/i, decision: { field: "anomaly", value: "edificio-anidado" }, because: "hablaste de algo dentro de algo: el patio entero cabe en la cara de una torre" },
  { match: /flot|levit|vuel|aire|nube/i, decision: { field: "anomaly", value: "torre-flotante" }, because: "hablaste de flotar: una torre se despega del patio" },
  { match: /cuerpo|brazo|pierna|cari[aá]tide|humano|gente|persona/i, decision: { field: "anomaly", value: "columna-figura" }, because: "hablaste de cuerpos: una columna se vuelve figura" },
  { match: /noche|oscur|luna|estrella|negro|sueño|dormi/i, decision: { field: "palette", value: "noche" }, because: "nombraste la noche: paleta nocturna sobre negro" },
  { match: /sol|día|crema|arena|luz|tarde|mañana/i, decision: { field: "palette", value: "friedeberg" }, because: "nombraste la luz del día: paleta crema, magenta y turquesa" },
  { match: /rot[oa]|torcid|raro|imposible|parad[oó]j|absurd|desorden|caos/i, decision: { field: "anomalyRate", value: 0.95 }, because: "pediste lo imposible: casi cada módulo rompe su simetría local" },
  { match: /perfect|simétric|orden|calma|equilibri/i, decision: { field: "anomalyRate", value: 0.05 }, because: "pediste orden: casi ninguna anomalía" },
  { match: /asimétric|ladead|inclinad|descentrad/i, decision: { field: "symmetry", value: "asymmetric" }, because: "pediste asimetría global" },
  { match: /plano|alzado|fachada|frente|de frente/i, decision: { field: "projection", value: "elevation" }, because: "pediste verlo de frente: alzado sin fuga" },
  { match: /lleno|denso|barroc|recargad|ornament|detall|mil|infinit/i, decision: { field: "density", value: 0.95 }, because: "pediste densidad: estrías, bandas y festones al máximo" },
  { match: /vací|escas|mínim|simple|limpi|austero|sobrio/i, decision: { field: "density", value: 0.2 }, because: "pediste austeridad: ornamento mínimo" },
  { match: /laberint|profund|galer|túnel|hondo|dentro/i, decision: { field: "complexity", value: 5 }, because: "pediste profundidad: cinco niveles de galería y cúpula" },
  { match: /pequeñ|chico|humilde|capilla|ermita/i, decision: { field: "complexity", value: 1 }, because: "pediste algo pequeño: un solo nivel" },
  { match: /siete|7 columnas/i, decision: { field: "columns", value: 7 }, because: "contaste siete columnas" },
  { match: /nueve|9 columnas/i, decision: { field: "columns", value: 9 }, because: "contaste nueve columnas" },
  { match: /cinco|5 columnas/i, decision: { field: "columns", value: 5 }, because: "contaste cinco columnas" },
];

export const WORDS_PER_COMPLEXITY_LEVEL = 6;
export const MAX_COMPLEXITY = 5;
export const DEFAULT_DENSITY = 0.6;
export const DEFAULT_ANOMALY = 0.4;
