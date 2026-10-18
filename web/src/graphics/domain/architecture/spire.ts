import type { Rect } from "./layout.ts";

export type SpireRules = { ledge: number; maxShare: number };

export const SPIRE: SpireRules = { ledge: 1.2, maxShare: 0.22 };

/** The spire's footprint inset from the roof by a walkable ledge, so the tower crowns in a flat cornice a figure can stand on. */
export function spireBase(roof: Rect): Rect {
  const m = Math.min(SPIRE.ledge, Math.min(roof.x1 - roof.x0, roof.z1 - roof.z0) * SPIRE.maxShare);
  return { x0: roof.x0 + m, z0: roof.z0 + m, x1: roof.x1 - m, z1: roof.z1 - m };
}
