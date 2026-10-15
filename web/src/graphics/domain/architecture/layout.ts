import type { AccessKind } from "./program.ts";

export type OpeningOverride = { at?: number; width?: number; height?: number; sill?: number };

export type OpeningSpec = { width: number; height: number; sill: number };

export type CloisterLayout = {
  footprint: { width: number; depth: number };
  courtyard: { width: number; depth: number };
  galleryWidth: number;
  roomsPerSide: { north: number; south: number; east: number; west: number };
  vestibuleWidth: number;
  heights: { room: number; gallery: number; tower: number; vestibule: number; roofSlab: number; towerRoof: number };
  walls: { exterior: number; interior: number; arcade: number };
  openings: Record<AccessKind, OpeningSpec>;
  arcadePier: number;
  cutHeight: number;
  openingOverrides: Record<string, OpeningOverride>;
};

export type Rect = { x0: number; z0: number; x1: number; z1: number };

export const rectWidth = (r: Rect): number => r.x1 - r.x0;
export const rectDepth = (r: Rect): number => r.z1 - r.z0;
export const rectArea = (r: Rect): number => rectWidth(r) * rectDepth(r);

export function rectOverlapArea(a: Rect, b: Rect): number {
  const w = Math.min(a.x1, b.x1) - Math.max(a.x0, b.x0);
  const d = Math.min(a.z1, b.z1) - Math.max(a.z0, b.z0);
  return w > 0 && d > 0 ? w * d : 0;
}

export function rectContains(outer: Rect, inner: Rect, eps = 1e-9): boolean {
  return inner.x0 >= outer.x0 - eps && inner.x1 <= outer.x1 + eps && inner.z0 >= outer.z0 - eps && inner.z1 <= outer.z1 + eps;
}
