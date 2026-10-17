import type { Box3, Vec3 } from "../../domain/math/vec3.ts";
import { isometricProjector } from "../projector.ts";
import { occlusionViolations, scenePainter, type OcclusionBody, type OcclusionResult, type Painter } from "./occlusion.ts";

export type OcclusionCase = { name: string; bodies: OcclusionBody[] };

const box = (min: Vec3, max: Vec3): Box3 => ({ min, max });
const solid = (id: string, min: Vec3, max: Vec3): OcclusionBody => ({ id, kind: "solid", box: box(min, max) });
const figure = (id: string, at: Vec3, h = 2.5): OcclusionBody => ({ id, kind: "figure", box: box([at[0] - 0.2, at[1], at[2] - 0.2], [at[0] + 0.2, at[1] + h, at[2] + 0.2]) });

export const OCCLUSION_CASES: OcclusionCase[] = [
  { name: "figura detrás de torre", bodies: [solid("torre", [2, 0, 2], [4, 10, 4]), figure("figura", [1, 0, 1])] },
  { name: "figura delante de torre", bodies: [solid("torre", [2, 0, 2], [4, 10, 4]), figure("figura", [5, 0, 5])] },
  {
    name: "figura dentro de patio cerrado",
    bodies: [
      solid("muro-n", [0, 0, 0], [6, 3, 0.3]),
      solid("muro-s", [0, 0, 5.7], [6, 3, 6]),
      solid("muro-o", [0, 0, 0.3], [0.3, 3, 5.7]),
      solid("muro-e", [5.7, 0, 0.3], [6, 3, 5.7]),
      figure("figura", [3, 0, 3]),
    ],
  },
  {
    name: "puentes cruzados",
    bodies: [
      solid("puente-bajo", [0, 4, 2.5], [8, 4.4, 3.5]),
      solid("puente-alto", [3.5, 7, 0], [4.5, 7.4, 8]),
      figure("bajo-el-puente", [4, 4.4, 3], 2),
      figure("sobre-el-puente", [4, 7.4, 5.2], 2),
    ],
  },
];

const FRAME = box([-2, 0, -2], [10, 12, 10]);

export type BatteryRow = OcclusionResult & { name: string };

/** Every case under the same isometric camera; the scene's painter unless another is given (to prove the check can fail). */
export function occlusionBattery(painter: Painter = scenePainter, azimuth = 0.62): BatteryRow[] {
  const projector = isometricProjector(FRAME, { width: 1200, height: 900, margin: 0.06 }, azimuth);
  return OCCLUSION_CASES.map((c) => ({ name: c.name, ...occlusionViolations(c.bodies, projector, painter) }));
}
