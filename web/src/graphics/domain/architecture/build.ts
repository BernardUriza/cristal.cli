import type { ArtConfig } from "../../config/types.ts";
import { pick, type Rng } from "../../../shared/rng";
import { buildColonnade } from "./colonnade.ts";
import type { Architecture } from "./types.ts";

const SPACING = 2.4;
const MAIN_Z = 20;
const STEPS = 3;
const STEP_HEIGHT = 0.22;

export function buildArchitecture(art: ArtConfig, rng: Rng): Architecture {
  const nCols = art.columns ?? pick(rng, [5, 7, 9]);
  const h = 4.2 + rng() * 1.2;
  const floorY = STEPS * STEP_HEIGHT;
  const main = buildColonnade(art, rng, { xCenter: 0, columns: nCols, spacing: SPACING, z: MAIN_Z, h, floorY, withDome: true });
  const wingOffset = main.halfWidth + SPACING * 2.6;
  const wingColumns = (side: number) => (art.symmetry === "asymmetric" && side > 0 ? pick(rng, [3, 5]) : 3);
  const wings = [-1, 1].map((side) =>
    buildColonnade(art, rng, { xCenter: side * wingOffset, columns: wingColumns(side), spacing: SPACING * 0.8, z: MAIN_Z + 7, h: h * 0.78, floorY: 0, withDome: true })
  );
  const sunU = art.symmetry === "asymmetric" ? 0.3 + rng() * 0.4 : 0.5;
  return {
    floor: { tile: 1.25, xMin: -16, xMax: 16, zMin: 2.4, zMax: 46, diamonds: art.density > 0.4, discs: art.density > 0.75 },
    platform: { halfWidth: main.halfWidth + 1.2, z: MAIN_Z - 1.4, depth: 2.8, steps: STEPS, stepHeight: STEP_HEIGHT },
    main,
    wings,
    sky: { sun: { u: sunU, v: 0.13, rays: 12 + 4 * art.complexity, fractalDepth: Math.min(art.complexity, 4) }, stars: Math.round(24 + 72 * art.density) },
  };
}
