import type { CloisterLayout } from "../domain/architecture/layout.ts";
import type { DrawingStyle } from "./drawings.ts";
import { PALETTES, type PaletteName } from "./palettes.ts";
import { CLOISTER_LAYOUT } from "./programs.ts";

export type OrnamentLanguage = "greca" | "chevrón" | "ajedrez" | "estrías" | "roseta" | "sierpinski";

export type PatioAnomaly = "none" | "escalera-imposible" | "edificio-anidado" | "torre-flotante" | "columna-figura";

export type PatioDetail = 1 | 2 | 3;

export type PatioConfig = {
  seed: number;
  palette: PaletteName;
  density: number;
  detail: PatioDetail;
  ornament: OrnamentLanguage[];
  anomaly: PatioAnomaly;
  azimuth: number;
  towers: 2 | 4;
  width: number;
  height: number;
};

export const ORNAMENT_LANGUAGES: readonly OrnamentLanguage[] = ["greca", "chevrón", "ajedrez", "estrías", "roseta", "sierpinski"];

export const PATIO_ANOMALIES: readonly PatioAnomaly[] = ["none", "escalera-imposible", "edificio-anidado", "torre-flotante", "columna-figura"];

export const DEFAULT_PATIO: PatioConfig = {
  seed: 7,
  palette: "friedeberg",
  density: 0.6,
  detail: 3,
  ornament: [...ORNAMENT_LANGUAGES],
  anomaly: "none",
  azimuth: 0.55,
  towers: 4,
  width: 1400,
  height: 1000,
};

/** Cloister proportions where the courtyard rules: galleries lower than rooms, rooms lower than the vestibule, towers above all. */
export const PATIO_LAYOUT: CloisterLayout = {
  ...CLOISTER_LAYOUT,
  footprint: { width: 34, depth: 30 },
  courtyard: { width: 18, depth: 14 },
  galleryWidth: 3,
  vestibuleWidth: 5,
  heights: { room: 4.5, gallery: 3.2, tower: 11, vestibule: 5.5, roofSlab: 0.3, towerRoof: 3.5 },
  openings: { ...CLOISTER_LAYOUT.openings, arch: { width: 2.4, height: 2.6, sill: 0 } },
  openingOverrides: {},
};

export const PATIO_APRON = 5;

/** Interrupted symmetry: the great hall rises behind the courtyard and two diagonal rooms break the ring's even height. */
export const PATIO_HEIGHTS: Record<string, number> = { "sala-n1": 6, "sala-n2": 6, "sala-e1": 5.2, "sala-w2": 5.2 };

export class PatioConfigError extends Error {}

function fail(message: string): never {
  throw new PatioConfigError(message);
}

export function resolvePatio(input: Partial<PatioConfig> = {}): PatioConfig {
  const cfg: PatioConfig = { ...DEFAULT_PATIO, ...input, ornament: [...(input.ornament ?? DEFAULT_PATIO.ornament)] };
  if (!Number.isInteger(cfg.seed) || cfg.seed < 0) fail(`seed must be a non-negative integer, got ${cfg.seed}`);
  if (!(cfg.palette in PALETTES)) fail(`unknown palette ${cfg.palette}`);
  if (!(cfg.density >= 0 && cfg.density <= 1)) fail(`density must be in 0..1, got ${cfg.density}`);
  if (![1, 2, 3].includes(cfg.detail)) fail(`detail must be 1, 2 or 3, got ${cfg.detail}`);
  for (const lang of cfg.ornament) if (!ORNAMENT_LANGUAGES.includes(lang)) fail(`unknown ornament language ${lang}`);
  if (!PATIO_ANOMALIES.includes(cfg.anomaly)) fail(`unknown anomaly ${cfg.anomaly}`);
  if (!Number.isFinite(cfg.azimuth)) fail(`azimuth must be a finite angle in radians`);
  if (cfg.towers !== 2 && cfg.towers !== 4) fail(`towers must be 2 or 4, got ${cfg.towers}`);
  if (!(cfg.width >= 200 && cfg.height >= 200)) fail(`viewport must be at least 200×200 px, got ${cfg.width}×${cfg.height}`);
  return cfg;
}

export function patioStyle(palette: PaletteName): DrawingStyle {
  const pal = PALETTES[palette];
  return {
    paper: pal.bg,
    ink: pal.ink,
    poche: pal.ink,
    cutWidth: 2,
    edgeWidth: 0.8,
    fills: { wall: pal.bg, lintel: pal.bg, sill: pal.bg, floor: pal.wall, roof: pal.wall, "tower-roof": pal.secondary },
  };
}
