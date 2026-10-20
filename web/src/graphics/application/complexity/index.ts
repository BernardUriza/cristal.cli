import { ACCEPTANCE, COMPLEXITY_TUNING, type Acceptance, type ComplexityTuning } from "../../config/complexity.ts";
import { multiscaleCoverage } from "./bands.ts";
import { rewriteComplexity } from "./chains.ts";
import { coverage } from "./coverage.ts";
import { rewriteEvidence } from "./rewriteEvidence.ts";
import { silhouetteReport, silhouetteUnits } from "./silhouettes.ts";
import { graphSignature, localSignatures } from "./topology.ts";
import type { ComplexityInput, ComplexityReport, RewriteEvidence } from "./types.ts";

export type { ComplexityReport, SpaceGraph } from "./types.ts";
export { clusterShapes, compositionSilhouette, isEligible, silhouetteUnits } from "./silhouettes.ts";
export { effectiveDiversity } from "./cluster.ts";
export { occlusionBattery } from "./occlusionCases.ts";
export { graphFromPlan, topologicalDiversity, toSpaceGraph } from "./topology.ts";
export { evaluate } from "./verdicts.ts";
export { ACCEPTANCE } from "../../config/complexity.ts";

function silhouettesOf(input: ComplexityInput, tuning: ComplexityTuning): ComplexityReport["silhouettes"] {
  const units = silhouetteUnits(input.list, input.width, input.height, tuning);
  return { buildings: silhouetteReport(units, "building", tuning), creatures: silhouetteReport(units, "creature", tuning) };
}

function evidenceOf(input: ComplexityInput, tuning: ComplexityTuning = COMPLEXITY_TUNING): RewriteEvidence[] {
  return rewriteEvidence(input.list, (input.provenance ?? []).flatMap((p) => p.rewrites ?? []), input.width, input.height, tuning);
}

export function complexityReport(input: ComplexityInput, tuning: ComplexityTuning = COMPLEXITY_TUNING, acceptance: Acceptance = ACCEPTANCE): ComplexityReport {
  const bands = multiscaleCoverage(input.list, input.width, input.height, tuning);
  const provenance = input.provenance ?? [];
  const site = provenance.map((p) => p.site).find(Boolean);
  return {
    topology: input.graph ? { signature: graphSignature(input.graph), localSignatures: localSignatures(input.graph).length } : null,
    rewrites: rewriteComplexity(evidenceOf(input, tuning), tuning.rewrite),
    multiscale: { bands, bandsAboveThreshold: bands.filter((b) => b.areaPct >= acceptance.bandAreaPct).length },
    silhouettes: silhouettesOf(input, tuning),
    coverage: coverage(input.list, input.width, input.height, site, provenance.flatMap((p) => p.regions ?? []), tuning),
    occlusionViolations: input.occlusionViolations ?? null,
  };
}
