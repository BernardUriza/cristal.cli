import { ACCEPTANCE, COMPLEXITY_TUNING, type Acceptance, type ComplexityTuning } from "../../config/complexity.ts";
import { multiscaleCoverage } from "./bands.ts";
import { semanticDepth } from "./depth.ts";
import { silhouetteDiversity } from "./silhouettes.ts";
import { graphSignature, localSignatures } from "./topology.ts";
import type { ComplexityInput, ComplexityReport } from "./types.ts";

export type { BandCoverage, ComplexityInput, ComplexityReport, RewriteEntry, SpaceGraph, SpaceGraphEdge, SpaceGraphNode } from "./types.ts";
export { detailBand, DETAIL_BANDS, multiscaleCoverage, type DetailBand } from "./bands.ts";
export { semanticDepth } from "./depth.ts";
export { silhouetteDescriptor, silhouetteDistance, silhouetteDiversity, silhouetteFamilies } from "./silhouettes.ts";
export { graphFromPlan, graphSignature, localSignatures, topologicalDiversity, toSpaceGraph, type GraphSource } from "./topology.ts";
export { ACCEPTANCE } from "../../config/complexity.ts";

export function complexityReport(input: ComplexityInput, tuning: ComplexityTuning = COMPLEXITY_TUNING, acceptance: Acceptance = ACCEPTANCE): ComplexityReport {
  const bands = multiscaleCoverage(input.list, input.width, input.height, tuning);
  return {
    topology: input.graph ? { signature: graphSignature(input.graph), localSignatures: localSignatures(input.graph).length } : null,
    semanticDepth: semanticDepth(input.provenance ?? []),
    multiscale: { bands, bandsAboveThreshold: bands.filter((b) => b.areaPct >= acceptance.bandAreaPct).length },
    silhouettes: silhouetteDiversity(input.list, input.width * input.height, tuning),
    occlusionViolations: input.occlusionViolations ?? null,
  };
}

export type Verdict = { criterio: string; valor: number | null; umbral: string; pasa: boolean | null };

export type SuiteContext = { topologies: number };

const atLeast = (criterio: string, valor: number | null, min: number): Verdict => ({ criterio, valor, umbral: `≥ ${min}`, pasa: valor === null ? null : valor >= min });

export function evaluate(report: ComplexityReport, suite?: SuiteContext, acceptance: Acceptance = ACCEPTANCE): Verdict[] {
  const occlusion = report.occlusionViolations;
  return [
    atLeast("topologías espaciales distintas (conjunto)", suite ? suite.topologies : null, acceptance.topologies),
    atLeast("niveles de sustitución", report.semanticDepth, acceptance.semanticDepth),
    atLeast(`bandas de detalle con ≥ ${acceptance.bandAreaPct} % del área`, report.multiscale.bandsAboveThreshold, acceptance.bands),
    atLeast("familias de siluetas", report.silhouettes.families, acceptance.silhouetteFamilies),
    { criterio: "figuras sin oclusión coherente", valor: occlusion, umbral: `= ${acceptance.occlusionViolations}`, pasa: occlusion === null ? null : occlusion <= acceptance.occlusionViolations },
  ];
}
