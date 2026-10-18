export type Acceptance = {
  topologies: number;
  bands: number;
  bandAreaPct: number;
  silhouetteClusters: number;
  silhouetteDiversity: number;
  occlusionViolations: number;
};

export const ACCEPTANCE: Acceptance = {
  topologies: 3,
  bands: 3,
  bandAreaPct: 8,
  silhouetteClusters: 4,
  silhouetteDiversity: 2.5,
  occlusionViolations: 0,
};

export type SilhouetteWeights = { fourier: number; aspect: number; concavity: number };

export type RewriteVerification = {
  minProjectedAreaPx: number;
  minVisibleRatio: number;
  minReplacedRatio: number;
  minFamilies: number;
  chainDepth: number;
};

export type ComplexityTuning = {
  cellPx: number;
  backgroundAreaRatio: number;
  circleSegments: number;
  silhouetteCellPx: number;
  silhouetteMinAreaPx: number;
  silhouetteMinVisibleRatio: number;
  silhouetteBins: number;
  silhouetteHarmonics: number;
  silhouetteWeights: SilhouetteWeights;
  silhouetteClusterDistance: number;
  rewrite: RewriteVerification;
};

export const COMPLEXITY_TUNING: ComplexityTuning = {
  cellPx: 8,
  backgroundAreaRatio: 0.6,
  circleSegments: 32,
  silhouetteCellPx: 2,
  silhouetteMinAreaPx: 400,
  silhouetteMinVisibleRatio: 0.35,
  silhouetteBins: 32,
  silhouetteHarmonics: 6,
  silhouetteWeights: { fourier: 4, aspect: 0.5, concavity: 2 },
  silhouetteClusterDistance: 0.45,
  rewrite: { minProjectedAreaPx: 64, minVisibleRatio: 0.35, minReplacedRatio: 0.5, minFamilies: 2, chainDepth: 3 },
};

/** The family of a rewrite rule: its T-number (T1_COLUMN_AS_BODY → T1); a chain needs two distinct ones. */
export const rewriteFamily = (ruleId: string): string => ruleId.split("_")[0];

/** A role's semantic class: «friso-habitado» is still a frieze, «cariatide» is not a pier. */
export const semanticClass = (role: string): string => role.split("-")[0].replace(/\d+$/, "");
