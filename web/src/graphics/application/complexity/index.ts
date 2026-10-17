import { ACCEPTANCE, COMPLEXITY_TUNING, type Acceptance, type ComplexityTuning } from "../../config/complexity.ts";
import { multiscaleCoverage } from "./bands.ts";
import { semanticDepth } from "./depth.ts";
import { silhouetteReport, silhouetteUnits } from "./silhouettes.ts";
import { graphSignature, localSignatures } from "./topology.ts";
import type { ComplexityInput, ComplexityReport, SilhouetteReport } from "./types.ts";

export type { BandCoverage, ComplexityInput, ComplexityReport, RewriteEntry, SilhouetteReport, SilhouetteUnit, SpaceGraph, SpaceGraphEdge, SpaceGraphNode } from "./types.ts";
export { detailBand, DETAIL_BANDS, multiscaleCoverage, type DetailBand } from "./bands.ts";
export { semanticDepth } from "./depth.ts";
export { clusterShapes, compositionSilhouette, isEligible, silhouetteReport, silhouetteUnits } from "./silhouettes.ts";
export { effectiveDiversity } from "./cluster.ts";
export { occlusionViolations, scenePainter, type OcclusionBody, type Painter } from "./occlusion.ts";
export { OCCLUSION_CASES, occlusionBattery, type BatteryRow } from "./occlusionCases.ts";
export { graphFromPlan, graphSignature, localSignatures, topologicalDiversity, toSpaceGraph, type GraphSource } from "./topology.ts";
export { ACCEPTANCE } from "../../config/complexity.ts";

function silhouettesOf(input: ComplexityInput, tuning: ComplexityTuning): ComplexityReport["silhouettes"] {
  const units = silhouetteUnits(input.list, input.width, input.height, tuning);
  const area = input.width * input.height;
  return { buildings: silhouetteReport(units, "building", area, tuning), creatures: silhouetteReport(units, "creature", area, tuning) };
}

export function complexityReport(input: ComplexityInput, tuning: ComplexityTuning = COMPLEXITY_TUNING, acceptance: Acceptance = ACCEPTANCE): ComplexityReport {
  const bands = multiscaleCoverage(input.list, input.width, input.height, tuning);
  return {
    topology: input.graph ? { signature: graphSignature(input.graph), localSignatures: localSignatures(input.graph).length } : null,
    semanticDepth: semanticDepth(input.provenance ?? []),
    multiscale: { bands, bandsAboveThreshold: bands.filter((b) => b.areaPct >= acceptance.bandAreaPct).length },
    silhouettes: silhouettesOf(input, tuning),
    occlusionViolations: input.occlusionViolations ?? null,
  };
}

export type Verdict = { criterio: string; valor: number | null; umbral: string; pasa: boolean | null; nota?: string };

export type SuiteContext = { topologies: number; occlusionViolations?: number };

const atLeast = (criterio: string, valor: number | null, min: number): Verdict => ({ criterio, valor, umbral: `≥ ${min}`, pasa: valor === null ? null : valor >= min });

const MONOLITHIC = "obra monolítica: una sola unidad arquitectónica; su complejidad se mide por niveles de sustitución, no por siluetas";

function silhouetteRows(label: string, s: SilhouetteReport, acceptance: Acceptance): Verdict[] {
  const absent = s.units === 0;
  const rows = [
    atLeast(`${label}: clústeres de siluetas visibles`, absent ? null : s.distinctClusters, acceptance.silhouetteClusters),
    atLeast(`${label}: diversidad efectiva de Shannon`, absent ? null : Number(s.effectiveDiversity.toFixed(2)), acceptance.silhouetteDiversity),
    atLeast(`${label}: cobertura visible del lienzo`, absent ? null : Number(s.visibleAreaCoverage.toFixed(3)), acceptance.silhouetteCoverage),
  ];
  return s.monolithic ? rows.map((r) => ({ ...r, pasa: null, nota: MONOLITHIC })) : rows;
}

export function evaluate(report: ComplexityReport, suite?: SuiteContext, acceptance: Acceptance = ACCEPTANCE): Verdict[] {
  const occlusion = report.occlusionViolations ?? suite?.occlusionViolations ?? null;
  return [
    atLeast("topologías espaciales distintas (conjunto)", suite ? suite.topologies : null, acceptance.topologies),
    atLeast("niveles de sustitución", report.semanticDepth, acceptance.semanticDepth),
    atLeast(`bandas de detalle con ≥ ${acceptance.bandAreaPct} % del área`, report.multiscale.bandsAboveThreshold, acceptance.bands),
    ...silhouetteRows("edificios", report.silhouettes.buildings, acceptance),
    ...silhouetteRows("criaturas", report.silhouettes.creatures, acceptance),
    { criterio: "figuras sin oclusión coherente", valor: occlusion, umbral: `= ${acceptance.occlusionViolations}`, pasa: occlusion === null ? null : occlusion <= acceptance.occlusionViolations },
  ];
}
