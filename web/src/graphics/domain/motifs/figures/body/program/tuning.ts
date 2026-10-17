import type { ArchGrammar } from "./types.ts";

export const PROGRAM_TUNING = {
  graftSeedStep: 7919,
  graftScale: 0.55,
  countMax: 8,
  chain: { scale: 0.86, turn: 14, via: "bottom" },
  bilateral: { step: -0.16, turn: 16 },
  grammars: { facade: "fachada (T2)", tower: "torre de pisos (T2 denso)", gallery: "galería de marcos (T3)" } as Record<ArchGrammar, string>,
} as const;
