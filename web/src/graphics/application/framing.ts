import { FIGURE_EXTENT, FRAMING } from "../config/framing.ts";
import { boundsOf, type Vec3 } from "../domain/math/vec3.ts";
import { isometricProjector, type Projector } from "./projector.ts";

export type Canvas = { width: number; height: number };

/** The one place a work is framed: the projected hull of everything in it (built, standing, flying) scaled and centred to the canvas inside the declared margin. */
export function framedIsometric(content: readonly Vec3[], canvas: Canvas, azimuth: number): Projector {
  return isometricProjector(boundsOf(content), { width: canvas.width, height: canvas.height, margin: FRAMING.margin }, azimuth, content);
}

/** Horizontal unit vectors of the view: `right` runs along the screen's x, `depth` away from the camera. */
export function groundAxes(forward: Vec3): { right: [number, number]; depth: [number, number] } {
  const len = Math.hypot(forward[0], forward[2]) || 1;
  const depth: [number, number] = [forward[0] / len, forward[2] / len];
  return { right: [-depth[1], depth[0]], depth };
}

/** The world points a figure of `heightM` standing at `at` covers as the painter draws it: a billboard across the screen. */
export function figurePoints(at: Vec3, heightM: number, forward: Vec3): Vec3[] {
  const { right } = groundAxes(forward);
  const w = heightM * FIGURE_EXTENT.halfWidth;
  const top = at[1] + heightM * FIGURE_EXTENT.height;
  return [-w, w].flatMap((k): Vec3[] => [[at[0] + right[0] * k, at[1], at[2] + right[1] * k], [at[0] + right[0] * k, top, at[2] + right[1] * k]]);
}
