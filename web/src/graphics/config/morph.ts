export const MORPH_FAMILIES = ["animales", "caras", "objetos"] as const;

export type MorphFamily = (typeof MORPH_FAMILIES)[number];

export type MorphPolicy = {
  pointsPerRegion: number;
  normIterations: number;
  keepScale: number;
  smoothing: number;
  relaxLadder: readonly number[];
  families: Record<MorphFamily, readonly string[]>;
};

export const MORPH_POLICY: MorphPolicy = {
  pointsPerRegion: 40,
  normIterations: 4,
  keepScale: 0.7,
  smoothing: 6,
  relaxLadder: [1, 0.9, 0.8, 0.7, 0.6, 0.5, 0.4, 0.3, 0.2, 0.1, 0],
  families: {
    animales: ["perro", "jaguar", "sirena"],
    caras: ["mascara", "craneo", "ojo"],
    objetos: ["mano", "escalera"],
  },
};
