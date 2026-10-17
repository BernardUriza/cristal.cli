export type Acceptance = {
  topologies: number;
  semanticDepth: number;
  bands: number;
  bandAreaPct: number;
  silhouetteClusters: number;
  silhouetteDiversity: number;
  silhouetteCoverage: number;
  occlusionViolations: number;
};

export const ACCEPTANCE: Acceptance = {
  topologies: 3,
  semanticDepth: 3,
  bands: 3,
  bandAreaPct: 8,
  silhouetteClusters: 4,
  silhouetteDiversity: 2.5,
  silhouetteCoverage: 0.4,
  occlusionViolations: 0,
};

export type SilhouetteWeights = { fourier: number; aspect: number; concavity: number };

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
};
