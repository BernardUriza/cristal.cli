import type { SpaceKind } from "./types.ts";

export type KindDimensions = { height: number; slab: number };

export const KIND_DIMENSIONS: Record<SpaceKind, KindDimensions> = {
  complex: { height: 0.5, slab: 0.5 },
  courtyard: { height: 0.15, slab: 0.15 },
  hall: { height: 8.5, slab: 0.4 },
  gallery: { height: 3.6, slab: 0.4 },
  tower: { height: 16, slab: 0.4 },
  stair: { height: 6, slab: 0.3 },
  chamber: { height: 4.2, slab: 0.35 },
  bridge: { height: 8, slab: 0.5 },
};

export const OPEN_GROUND_STYLES: readonly string[] = ["city"];

export const STREET_BY_STYLE: Partial<Record<string, number>> = { city: 9 };

export const LAYOUT_RULES = {
  precinctMargin: 2,
  courtyardMargin: 2.5,
  minShared: 2,
  street: 3,
  slideStep: 1,
  towerRoof: 6,
  pillarSpacing: 2.6,
  pillar: 0.55,
  riser: 0.3,
} as const;
