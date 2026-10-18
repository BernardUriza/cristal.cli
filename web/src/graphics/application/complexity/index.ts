import { ACCEPTANCE, COMPLEXITY_TUNING, type Acceptance, type ComplexityTuning } from "../../config/complexity.ts";
import { multiscaleCoverage } from "./bands.ts";
import { rewriteComplexity } from "./chains.ts";
import { coverage } from "./coverage.ts";
import { rewriteEvidence } from "./rewriteEvidence.ts";
import { silhouetteReport, silhouetteUnits } from "./silhouettes.ts";
import { graphSignature, localSignatures } from "./topology.ts";
import type { ComplexityInput, ComplexityReport, RewriteEvidence } from "./types.ts";

export type { BandCoverage, BoxM, ComplexityInput, ComplexityReport, CoverageReport, CreatureCoverage, ProvenanceLike, RegionEvidence, RewriteComplexity, RewriteEvidence, RewriteRecordLike, SilhouetteReport, SilhouetteUnit, SiteEvidence, SpaceGraph, SpaceGraphEdge, SpaceGraphNode, StructuralRelation } from "./types.ts";
export { detailBand, DETAIL_BANDS, multiscaleCoverage, type DetailBand } from "./bands.ts";
export { isVerified, rewriteComplexity } from "./chains.ts";
export { coverage, SiteError, siteHull } from "./coverage.ts";
export { rewriteEvidence } from "./rewriteEvidence.ts";
export { clusterShapes, compositionSilhouette, isEligible, silhouetteReport, silhouetteUnits } from "./silhouettes.ts";
export { effectiveDiversity } from "./cluster.ts";
export { occlusionViolations, scenePainter, type OcclusionBody, type Painter } from "./occlusion.ts";
export { OCCLUSION_CASES, occlusionBattery, type BatteryRow } from "./occlusionCases.ts";
export { graphFromPlan, graphSignature, localSignatures, topologicalDiversity, toSpaceGraph, type GraphSource } from "./topology.ts";
export { evaluate, type SuiteContext, type Verdict } from "./verdicts.ts";
export { ACCEPTANCE } from "../../config/complexity.ts";

function silhouettesOf(input: ComplexityInput, tuning: ComplexityTuning): ComplexityReport["silhouettes"] {
  const units = silhouetteUnits(input.list, input.width, input.height, tuning);
  return { buildings: silhouetteReport(units, "building", tuning), creatures: silhouetteReport(units, "creature", tuning) };
}

export function evidenceOf(input: ComplexityInput, tuning: ComplexityTuning = COMPLEXITY_TUNING): RewriteEvidence[] {
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
