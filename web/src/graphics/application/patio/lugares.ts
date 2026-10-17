import type { Group } from "../../config/scene.ts";
import { FIGURE_SCALE } from "../../config/figures.ts";
import type { Rect } from "../../domain/architecture/layout.ts";
import type { Building } from "../../domain/architecture/mass.ts";
import type { Vec3 } from "../../domain/math/vec3.ts";
import type { Projector } from "../projector.ts";
import { crowdOf, isProtagonist, protagonistStand, wantedHeightM } from "./protagonista.ts";
import { boxesOf, type Flight, type Footing, type Site } from "./sitio.ts";

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
    stages: [{ rect: court, y: 0 }],
    towers: spaces.filter((s) => s.kind === "tower").map((t) => ({ rect: t.rect, y: t.height + h.roofSlab + h.towerRoof })),
    roofs: spaces.filter((s) => s.kind === "room" || s.kind === "gallery").map((s) => ({ rect: s.rect, y: s.height + h.roofSlab })),
    stairs: [],
    sky: { rect: court, y: h.tower * SKY_LIFT },
    obstacles: boxesOf(building.solids),
  };
}

/** A crowd stands at human scale; a lone or giant figure is the protagonist (see protagonista.ts). */
export function creatureHeightM(g: Group, c: Site): number {
  if (!isProtagonist(g)) return Math.max(FIGURE_SCALE.minHeightM, (c.span * FIGURE_SCALE.crowd * g.scale) / crowdOf(g));
  const perched = g.place === "torres" && c.towers.length ? Math.min(...c.towers.map((t) => t.y)) * FIGURE_SCALE.perched : Infinity;
  return protagonistStand(g, c)?.heightM ?? Math.max(FIGURE_SCALE.minHeightM, Math.min(wantedHeightM(g, c), perched));
}

function arrange(g: Group, r: Rect, y: number, rise: number): Vec3[] {
  const cx = (r.x0 + r.x1) / 2;
  const cz = (r.z0 + r.z1) / 2;
  const w = (r.x1 - r.x0) * 0.8;
  const d = (r.z1 - r.z0) * 0.8;
  const n = g.count;
  return Array.from({ length: n }, (_, i): Vec3 => {
    const t = n === 1 ? 0.5 : i / (n - 1);
    const a = (i / n) * Math.PI * 2;
    switch (g.arrangement) {
      case "circulo":
      case "corona":
        return [cx + Math.cos(a) * w * 0.4, y, cz + Math.sin(a) * d * 0.4];
      case "espiral": {
        const rr = 0.08 + 0.42 * t;
        return [cx + Math.cos(a * 2.2) * w * rr, y, cz + Math.sin(a * 2.2) * d * rr];
      }
      case "reticula": {
        const cols = Math.ceil(Math.sqrt(n));
        const rows = Math.ceil(n / cols);
        return [cx - w / 2 + (w * ((i % cols) + 0.5)) / cols, y, cz - d / 2 + (d * (Math.floor(i / cols) + 0.5)) / rows];
      }
      case "escalera":
        return [cx - w / 2 + w * t, y + i * rise, cz + d / 2 - d * t];
      case "procesion":
        return [cx - w / 2 + w * t, y, cz + Math.sin(t * Math.PI * 2) * d * 0.25];
      default:
        return [cx - w / 2 + w * t, y, cz];
    }
  });
}

function onFlights(n: number, flights: readonly Flight[], rise: number): Vec3[] {
  return Array.from({ length: n }, (_, i): Vec3 => {
    const f = flights[i % flights.length];
    const lap = Math.floor(i / flights.length);
    const per = Math.ceil(n / flights.length);
    const t = per === 1 ? 0.5 : lap / (per - 1);
    return [f.from[0] + (f.to[0] - f.from[0]) * t, f.from[1] + (f.to[1] - f.from[1]) * t + lap * rise * 0.5, f.from[2] + (f.to[2] - f.from[2]) * t];
  });
}

export function spotsFor(g: Group, c: Site): Vec3[] {
  const hM = creatureHeightM(g, c);
  const rise = hM * STEP_RISE;
  const centre = (f: Footing, lift: number): Vec3 => [(f.rect.x0 + f.rect.x1) / 2, f.y + lift, (f.rect.z0 + f.rect.z1) / 2];
  const stand = protagonistStand(g, c);
  if (stand) return arrange(g.place === "escalera" ? { ...g, arrangement: "escalera" } : g, stand.footing.rect, stand.footing.y, rise);
  if (g.place === "torres" && c.towers.length) return Array.from({ length: g.count }, (_, i) => centre(c.towers[i % c.towers.length], Math.floor(i / c.towers.length) * hM));
  if (g.place === "azoteas" && c.roofs.length) return Array.from({ length: g.count }, (_, i) => centre(c.roofs[(i * 3) % c.roofs.length], 0));
  if (g.place === "cielo") return arrange({ ...g, arrangement: g.arrangement === "escalera" ? "escalera" : "circulo" }, c.sky.rect, c.sky.y, rise);
  if (g.place === "escalera" && c.stairs.length) return onFlights(g.count, c.stairs, rise);
  if (g.place === "escalera") return arrange({ ...g, arrangement: "escalera" }, c.floor.rect, c.floor.y, rise);
  return arrange(g, c.floor.rect, c.floor.y, rise);
}
