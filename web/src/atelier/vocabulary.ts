export const COMPOSITIONS = ["templo", "patio"] as const;
export type Composition = (typeof COMPOSITIONS)[number];

export const MOTIF_NAMES = ["ojo", "mano", "craneo", "perro", "jaguar", "escalera", "mascara", "sirena"] as const;
export type MotifName = (typeof MOTIF_NAMES)[number];

export const ORNAMENT_LANGUAGES = ["greca", "chevrón", "ajedrez", "estrías", "roseta", "sierpinski"] as const;
export type OrnamentLanguage = (typeof ORNAMENT_LANGUAGES)[number];

export const ANOMALIES = ["none", "escalera-imposible", "edificio-anidado", "torre-flotante", "columna-figura"] as const;
export type Anomaly = (typeof ANOMALIES)[number];

export const MAX_MOTIFS = 3;
export const MAX_LANGUAGES = 3;

export function isOneOf<T extends string>(list: readonly T[], value: unknown): value is T {
  return typeof value === "string" && (list as readonly string[]).includes(value);
}
