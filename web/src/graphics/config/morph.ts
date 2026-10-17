export type MorphPolicy = {
  pointsPerRegion: number;
  normIterations: number;
  keepScale: number;
};

export const MORPH_POLICY: MorphPolicy = {
  pointsPerRegion: 40,
  normIterations: 4,
  keepScale: 0.7,
};
