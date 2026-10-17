import { FIGURE_EXTENT } from "../../config/framing.ts";
import { FIGURE_SCALE, PROTAGONIST_NAMES } from "../../config/figures.ts";
import type { Group } from "../../config/scene.ts";
import type { Rect } from "../../domain/architecture/layout.ts";
import type { Vec3 } from "../../domain/math/vec3.ts";
import { groundAxes } from "../framing.ts";
import { clearHeight } from "./holgura.ts";
import type { Footing, Site } from "./sitio.ts";

export type Stand = { footing: Footing; heightM: number };

export const isProtagonist = (g: Group) => g.count === 1 || PROTAGONIST_NAMES.test(g.creature.name);

function standsOnGround(g: Group, c: Site): boolean {
  if (g.place === "torres") return !c.towers.length;
  if (g.place === "azoteas") return !c.roofs.length;
  if (g.place === "escalera") return !c.stairs.length;
  return g.place !== "cielo";
}

const chord = (r: Rect, u: readonly [number, number]) => Math.min((r.x1 - r.x0) / Math.max(Math.abs(u[0]), 1e-9), (r.z1 - r.z0) / Math.max(Math.abs(u[1]), 1e-9));

/** The tallest figure a footing holds: its billboard across the screen and its body in depth inside the footing, and under the ceiling when it is roofed. */
export function roomOn(f: Footing, c: Pick<Site, "projector">): number {
  const { right, depth } = groundAxes(c.projector.forward);
  const fits = Math.min(chord(f.rect, right) / (2 * FIGURE_EXTENT.halfWidth), chord(f.rect, depth) / FIGURE_EXTENT.depth);
  return f.ceiling === undefined ? fits : Math.min(fits, (f.ceiling - f.y) / FIGURE_EXTENT.height);
}

const area = (f: Footing) => (f.rect.x1 - f.rect.x0) * (f.rect.z1 - f.rect.z0);

export const crowdOf = (g: Group) => Math.max(1, Math.sqrt(g.count) / 2);

export function wantedHeightM(g: Group, c: Site): number {
  return Math.min((c.span * FIGURE_SCALE.protagonist * g.scale) / crowdOf(g), c.span * FIGURE_SCALE.protagonistOfSite);
}

const centreOf = (f: Footing): Vec3 => [(f.rect.x0 + f.rect.x1) / 2, f.y, (f.rect.z0 + f.rect.z1) / 2];

const tallest = (stands: readonly Stand[]) => stands.reduce((best, s) => (s.heightM > best.heightM + 1e-9 ? s : best));

/** A protagonist on the ground takes the open floor where its body grows tallest without entering any solid; if even that is below its share, it may stand over the roof that clears it more. */
export function protagonistStand(g: Group, c: Site): Stand | null {
  if (!isProtagonist(g) || !standsOnGround(g, c)) return null;
  const wanted = wantedHeightM(g, c);
  const at = (footing: Footing): Stand => ({ footing, heightM: clearHeight(centreOf(footing), wanted, c.projector.forward, c.obstacles, FIGURE_SCALE.minHeightM) });
  const ground = tallest(c.stages.map(at));
  if (ground.heightM >= wanted * FIGURE_SCALE.fitShare || !c.roofs.length) return ground;
  return tallest([ground, ...[...c.roofs].sort((a, b) => area(b) - area(a)).map(at)]);
}
