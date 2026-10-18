import type { Group, Scene } from "../../config/scene.ts";
import type { RegionEvidence } from "../complexity/types.ts";
import { boxOn, prismCorners } from "../siteEvidence.ts";
import { creatureHeightM } from "./lugares.ts";
import { isProtagonist, protagonistStand } from "./protagonista.ts";
import type { Footing, Site } from "./sitio.ts";

const stepFootings = (c: Site): Footing[] =>
  c.stairs.flatMap((f) => (f.steps ?? []).map((b) => ({ rect: { x0: b.min[0], x1: b.max[0], z0: b.min[2], z1: b.max[2] }, y: b.max[1] })));

/** The footings the narrated place assigns to a group (not where its bodies ended up): towers, roofs, sky, stair flights, else the protagonist's stand or the crowd's walks. */
function footingsOf(g: Group, c: Site): Footing[] {
  const steps = stepFootings(c);
  if (g.place === "torres" && c.towers.length) return c.towers;
  if (g.place === "azoteas" && c.roofs.length) return c.roofs;
  if (g.place === "cielo") return [c.sky];
  if (g.place === "escalera" && steps.length) return steps;
  if (isProtagonist(g)) return [protagonistStand(g, c)?.footing ?? c.floor];
  return c.walks.length ? c.walks : [c.floor];
}

/** Each group's narrative region: its footings raised to the group's own height, projected with the scene's camera. */
export function narrativeRegions(scene: Scene, c: Site): RegionEvidence[] {
  return scene.groups.map((g, group) => {
    const h = creatureHeightM(g, c);
    return { group, creature: g.creature.name, place: g.place, prisms: footingsOf(g, c).map((f) => prismCorners(boxOn(f.rect, f.y, f.y + h), c.projector.toScreen)) };
  });
}
