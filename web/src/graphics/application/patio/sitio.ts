import type { Rect } from "../../domain/architecture/layout.ts";
import type { Solid } from "../../domain/architecture/mass.ts";
import { boundsOf, type Box3, type Vec3 } from "../../domain/math/vec3.ts";
import type { Projector } from "../projector.ts";

export type Footing = { rect: Rect; y: number; ceiling?: number };

export type Flight = { from: Vec3; to: Vec3 };

/** Where figures can stand: `floor` for crowds, `stages` every open ground a protagonist may take. */
export type Site = { projector: Projector; span: number; floor: Footing; stages: Footing[]; towers: Footing[]; roofs: Footing[]; stairs: Flight[]; sky: Footing; obstacles: Box3[] };

export const boxesOf = (solids: readonly Solid[]): Box3[] => solids.map((s) => boundsOf(s.faces.flatMap((f) => f.points)));

export const minSideOf = (r: Rect) => Math.min(r.x1 - r.x0, r.z1 - r.z0);
