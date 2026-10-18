export type FigureScale = {
  crowd: number;
  protagonist: number;
  protagonistOfSite: number;
  fitShare: number;
  perched: number;
  minHeightM: number;
  crowdFloorM: number;
  crowdShrinkSteps: number;
  crowdSamples: number;
};

export const FIGURE_SCALE: FigureScale = {
  crowd: 0.34,
  protagonist: 0.45,
  protagonistOfSite: 0.6,
  fitShare: 0.6,
  perched: 0.6,
  minHeightM: 3,
  crowdFloorM: 1.7,
  crowdShrinkSteps: 10,
  crowdSamples: 96,
};

/** A figure on a tower crown: `towardEdge` of the way from the spire's front corner to the roof's (less `edgeMargin` m), feet within `footTolerance` m of the surface. */
export type Perch = { edgeMargin: number; towardEdge: number; footTolerance: number };

export const PERCH: Perch = { edgeMargin: 0.1, towardEdge: 0.6, footTolerance: 0.02 };

export const PROTAGONIST_NAMES = /gigante|coloso/i;
