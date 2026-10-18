import { ACCEPTANCE, type Acceptance } from "../../config/complexity.ts";
import type { ComplexityReport, CoverageReport, SilhouetteReport } from "./types.ts";

export type Verdict = { criterio: string; valor: number | null; umbral: string; pasa: boolean | null; nota?: string };

export type SuiteContext = { topologies: number; occlusionViolations?: number };

const atLeast = (criterio: string, valor: number | null, min: number): Verdict => ({ criterio, valor, umbral: `≥ ${min}`, pasa: valor === null ? null : valor >= min });

const NO_THRESHOLD = "sin umbral: distribución por arquetipo";

const measured = (criterio: string, valor: number | null, nota?: string): Verdict => ({ criterio, valor: valor === null ? null : Number(valor.toFixed(3)), umbral: NO_THRESHOLD, pasa: null, ...(nota ? { nota } : {}) });

const MONOLITHIC = "obra monolítica: una sola unidad arquitectónica; su complejidad se mide por cadenas de reescritura verificadas, no por siluetas";

const DEPTH_NOTE = "profundidad ≥ 3 se exige sólo en los tests de recursividad arquitectónica, no en cada obra";

function silhouetteRows(label: string, s: SilhouetteReport, acceptance: Acceptance): Verdict[] {
  const absent = s.units === 0;
  const rows = [
    atLeast(`${label}: clústeres de siluetas visibles`, absent ? null : s.distinctClusters, acceptance.silhouetteClusters),
    atLeast(`${label}: diversidad efectiva de Shannon`, absent ? null : Number(s.effectiveDiversity.toFixed(2)), acceptance.silhouetteDiversity),
  ];
  return s.monolithic ? rows.map((r) => ({ ...r, pasa: null, nota: MONOLITHIC })) : rows;
}

const coverageRows = (label: string, c: CoverageReport): Verdict[] => [
  measured(`${label}: siteFill (visible ∩ envolvente del sitio / envolvente)`, c.siteFill),
  measured(`${label}: canvasFill (visible / lienzo)`, c.canvasFill),
  measured(`${label}: hullEfficiency (envolvente / lienzo)`, c.hullEfficiency),
];

export function evaluate(report: ComplexityReport, suite?: SuiteContext, acceptance: Acceptance = ACCEPTANCE): Verdict[] {
  const occlusion = report.occlusionViolations ?? suite?.occlusionViolations ?? null;
  const c = report.coverage;
  return [
    atLeast("topologías espaciales distintas (conjunto)", suite ? suite.topologies : null, acceptance.topologies),
    measured("reescritura: profundidad máxima verificada", report.rewrites.maxVerifiedDepth, DEPTH_NOTE),
    measured("reescritura: cadenas visibles de profundidad ≥ 3", report.rewrites.visibleChainsDepth3, DEPTH_NOTE),
    atLeast(`bandas de detalle con ≥ ${acceptance.bandAreaPct} % del área`, report.multiscale.bandsAboveThreshold, acceptance.bands),
    ...silhouetteRows("edificios", report.silhouettes.buildings, acceptance),
    ...coverageRows("edificios", c.buildings),
    ...silhouetteRows("criaturas", report.silhouettes.creatures, acceptance),
    ...coverageRows("criaturas", c.creatures),
    measured("criaturas: regionFill (visible ∩ región narrativa / región)", c.creatures.regionFill),
    { criterio: "figuras sin oclusión coherente", valor: occlusion, umbral: `= ${acceptance.occlusionViolations}`, pasa: occlusion === null ? null : occlusion <= acceptance.occlusionViolations },
  ];
}
