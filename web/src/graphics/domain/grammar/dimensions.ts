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
  sanctuary: { height: 11, slab: 0.5 },
  shrine: { height: 5.5, slab: 0.35 },
  "ring-gallery": { height: 0.3, slab: 0.3 },
  platform: { height: 2.4, slab: 2.4 },
  plaza: { height: 0.15, slab: 0.15 },
  block: { height: 0.35, slab: 0.35 },
  building: { height: 9, slab: 0.4 },
  street: { height: 0.12, slab: 0.12 },
  junction: { height: 0.12, slab: 0.12 },
  "street-ring": { height: 0.12, slab: 0.12 },
  altar: { height: 1.8, slab: 0.3 },
  causeway: { height: 0.6, slab: 0.6 },
  crest: { height: 5, slab: 0.3 },
  precinct: { height: 0.3, slab: 0.3 },
};

export const CONTAINER_MARGIN: Partial<Record<SpaceKind, number>> = {
  courtyard: 2.5,
  "ring-gallery": 5,
  "street-ring": 4,
  platform: 2,
  block: 1,
  precinct: 8,
};

export const GAP_INSIDE: Partial<Record<SpaceKind, number>> = { block: 1.5 };

export const BANQUETTE = { width: 6, height: 2.6 } as const;

export const ARCADE = { height: 3.8, slab: 0.4 } as const;

export const OPEN_GROUND_STYLES: readonly string[] = ["city"];

export const STREET_BY_STYLE: Partial<Record<string, number>> = { city: 9 };

export const LAYOUT_RULES = {
  precinctMargin: 2,
  minShared: 2,
  street: 3,
  slideStep: 1,
  towerRoof: 6,
  pillarSpacing: 2.6,
  pillar: 0.55,
  riser: 0.3,
  kerb: 0.25,
  obelisk: 0.9,
} as const;
