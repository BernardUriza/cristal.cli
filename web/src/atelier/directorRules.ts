import type { PaletteName } from "../graphics/config/palettes.ts";
import type { ProjectionKind, Symmetry } from "../graphics/config/types.ts";

export type Decision =
  | { field: "palette"; value: PaletteName }
  | { field: "symmetry"; value: Symmetry }
  | { field: "projection"; value: ProjectionKind }
  | { field: "complexity"; value: number }
  | { field: "density"; value: number }
  | { field: "anomalyRate"; value: number }
  | { field: "columns"; value: number };

export type DirectorRule = { match: RegExp; decision: Decision; because: string };

export const DIRECTOR_RULES: DirectorRule[] = [
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
