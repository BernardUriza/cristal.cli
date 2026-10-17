export type Acceptance = {
  topologies: number;
  semanticDepth: number;
  bands: number;
  bandAreaPct: number;
  silhouetteFamilies: number;
  occlusionViolations: number;
};

export const ACCEPTANCE: Acceptance = {
  topologies: 3,
  semanticDepth: 3,
  bands: 3,
  bandAreaPct: 8,
  silhouetteFamilies: 5,
  occlusionViolations: 0,
};

export type ComplexityTuning = {
  cellPx: number;
  backgroundAreaRatio: number;
  silhouetteMinAreaPx: number;
  silhouetteRays: number;
  silhouetteThreshold: number;
  circleSegments: number;
};

export const COMPLEXITY_TUNING: ComplexityTuning = {
  cellPx: 8,
  backgroundAreaRatio: 0.6,
  silhouetteMinAreaPx: 400,
  silhouetteRays: 16,
  silhouetteThreshold: 0.12,
  circleSegments: 32,
};
