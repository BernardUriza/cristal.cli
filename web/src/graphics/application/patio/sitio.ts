import type { Rect } from "../../domain/architecture/layout.ts";
import type { Solid } from "../../domain/architecture/mass.ts";
import { boundsOf, type Box3, type Vec3 } from "../../domain/math/vec3.ts";
import type { Projector } from "../projector.ts";

/** `hole` is the part of the footing a solid stands on (a spire on its tower roof): nobody stands there. */
export type Footing = { rect: Rect; y: number; ceiling?: number; label?: string; hole?: Rect };

export type Flight = { from: Vec3; to: Vec3; steps?: Box3[] };

/** Where figures can stand: `walks` the ground a crowd walks (streets, plaza, rings, terraces), `stages` every open ground a protagonist may take. */
export type Site = { projector: Projector; span: number; floor: Footing; walks: Footing[]; stages: Footing[]; towers: Footing[]; roofs: Footing[]; stairs: Flight[]; sky: Footing; obstacles: Box3[] };

export const boxesOf = (solids: readonly Solid[]): Box3[] => solids.map((s) => boundsOf(s.faces.flatMap((f) => f.points)));

export const minSideOf = (r: Rect) => Math.min(r.x1 - r.x0, r.z1 - r.z0);

const planOf = (s: Solid): Rect => {
  const b = boxesOf([s])[0];
  return { x0: b.min[0], x1: b.max[0], z0: b.min[2], z1: b.max[2] };
};

/** A tower's crown as a footing: the top of its roof slab (else the tower's own plan), with its spire's footprint, when it has one, as the hole. */
export function crownOf(plan: Rect, roofY: number, roof: Solid | undefined, spire: Solid | undefined): Footing {
  const rect = roof ? planOf(roof) : plan;
  return spire ? { rect, y: roofY, hole: planOf(spire) } : { rect, y: roofY };
}
