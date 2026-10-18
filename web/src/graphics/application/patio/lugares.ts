import type { Group } from "../../config/scene.ts";
import { FIGURE_SCALE } from "../../config/figures.ts";
import type { Building } from "../../domain/architecture/mass.ts";
import type { Vec3 } from "../../domain/math/vec3.ts";
import type { Projector } from "../projector.ts";
import { arrange } from "./acomodo.ts";
import { crowdOn, liftedSpots } from "./multitud.ts";
import { isProtagonist, protagonistStand, wantedHeightM } from "./protagonista.ts";
import { boxesOf, type Site } from "./sitio.ts";

export type { Flight, Footing, Site } from "./sitio.ts";

export type Spot = { at: Vec3; group: number };

const STEP_RISE = 0.35;
const SKY_LIFT = 1.25;

export function siteOfBuilding(building: Building, projector: Projector): Site {
  const h = building.plan.layout.heights;
  const spaces = building.plan.spaces;
  const court = spaces.find((s) => s.kind === "courtyard")!.rect;
  return {
    projector,
    span: Math.min(court.x1 - court.x0, court.z1 - court.z0),
    floor: { rect: court, y: 0 },
    walks: [{ rect: court, y: 0, label: "patio" }],
    stages: [{ rect: court, y: 0 }],
    towers: spaces.filter((s) => s.kind === "tower").map((t) => ({ rect: t.rect, y: t.height + h.roofSlab + h.towerRoof })),
    roofs: spaces.filter((s) => s.kind === "room" || s.kind === "gallery").map((s) => ({ rect: s.rect, y: s.height + h.roofSlab })),
    stairs: [],
    sky: { rect: court, y: h.tower * SKY_LIFT },
    obstacles: boxesOf(building.solids),
  };
}

/** A crowd takes the height its walkable ground clears (see multitud.ts); a lone or giant figure is the protagonist (see protagonista.ts). */
export function creatureHeightM(g: Group, c: Site): number {
  if (!isProtagonist(g)) return crowdOn(g, c).heightM;
  const perched = g.place === "torres" && c.towers.length ? Math.min(...c.towers.map((t) => t.y)) * FIGURE_SCALE.perched : Infinity;
  return protagonistStand(g, c)?.heightM ?? Math.max(FIGURE_SCALE.minHeightM, Math.min(wantedHeightM(g, c), perched));
}

export function spotsFor(g: Group, c: Site): Vec3[] {
  if (!isProtagonist(g)) return crowdOn(g, c).spots;
  const stand = protagonistStand(g, c);
  if (!stand) return liftedSpots(g, c, creatureHeightM(g, c)) ?? arrange(g, c.floor.rect, c.floor.y, 0);
  return arrange(g.place === "escalera" ? { ...g, arrangement: "escalera" } : g, stand.footing.rect, stand.footing.y, stand.heightM * STEP_RISE);
}
