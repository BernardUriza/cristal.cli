import type { Vec2 } from "../../shapes.ts";

export const REGIONS = ["cabeza", "tronco", "punta", "extremidad"] as const;

export type Region = (typeof REGIONS)[number];

export type RegionAnchors = Record<Region, Vec2>;
