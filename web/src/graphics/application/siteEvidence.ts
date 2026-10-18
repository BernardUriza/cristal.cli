import type { Rect } from "../domain/architecture/layout.ts";
import type { Vec3 } from "../domain/math/vec3.ts";
import type { Vec2 } from "../domain/shapes.ts";
import type { BoxM, SiteEvidence } from "./complexity/types.ts";

type ToScreen = (p: Vec3) => Vec2;

export const prismCorners = (b: BoxM, toScreen: ToScreen): Vec2[] =>
  [b.y0, b.y1].flatMap((y) => [[b.x0, b.z0], [b.x1, b.z0], [b.x1, b.z1], [b.x0, b.z1]].map(([x, z]) => toScreen([x, y, z])));

export const boxOn = (r: Rect, y0: number, y1: number): BoxM => ({ x0: r.x0, x1: r.x1, z0: r.z0, z1: r.z1, y0, y1 });

/** The site exactly as the program or patio declares it, courtyards and voids included, projected with the scene's camera. */
export function siteEvidence(declaredBy: SiteEvidence["declaredBy"], footprintM: BoxM, toScreen: ToScreen): SiteEvidence {
  return { declaredBy, footprintM, corners: prismCorners(footprintM, toScreen) };
}
