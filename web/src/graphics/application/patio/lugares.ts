import type { Group } from "../../config/scene.ts";
import type { Building } from "../../domain/architecture/mass.ts";
import type { Vec3 } from "../../domain/math/vec3.ts";
import type { Projector } from "../projector.ts";

export type Site = { building: Building; projector: Projector };

export type Spot = { at: Vec3; group: number };

const STEP_RISE = 0.35;
const SKY_LIFT = 1.25;
const PROTAGONIST = 0.34;
const MIN_HEIGHT_M = 3;

function courtyard(c: Site) {
  return c.building.plan.spaces.find((s) => s.kind === "courtyard")!.rect;
}

export function creatureHeightM(g: Group, c: Site): number {
  const r = courtyard(c);
  const court = Math.min(r.x1 - r.x0, r.z1 - r.z0);
  return Math.max(MIN_HEIGHT_M, (court * PROTAGONIST * g.scale) / Math.max(1, Math.sqrt(g.count) / 2));
}

function arrangeOnFloor(g: Group, c: Site, y: number): Vec3[] {
  const r = courtyard(c);
  const rise = creatureHeightM(g, c) * STEP_RISE;
  const cx = (r.x0 + r.x1) / 2;
  const cz = (r.z0 + r.z1) / 2;
  const w = (r.x1 - r.x0) * 0.8;
  const d = (r.z1 - r.z0) * 0.8;
  const n = g.count;
  const out: Vec3[] = [];
  for (let i = 0; i < n; i++) {
    const t = n === 1 ? 0.5 : i / (n - 1);
    const a = (i / n) * Math.PI * 2;
    switch (g.arrangement) {
      case "circulo":
      case "corona":
        out.push([cx + Math.cos(a) * w * 0.4, y, cz + Math.sin(a) * d * 0.4]);
        break;
      case "espiral": {
        const rr = 0.08 + 0.42 * t;
        out.push([cx + Math.cos(a * 2.2) * w * rr, y, cz + Math.sin(a * 2.2) * d * rr]);
        break;
      }
      case "reticula": {
        const cols = Math.ceil(Math.sqrt(n));
        const rows = Math.ceil(n / cols);
        const col = i % cols;
        const row = Math.floor(i / cols);
        out.push([cx - w / 2 + (w * (col + 0.5)) / cols, y, cz - d / 2 + (d * (row + 0.5)) / rows]);
        break;
      }
      case "escalera":
        out.push([cx - w / 2 + w * t, y + i * rise, cz + d / 2 - d * t]);
        break;
      case "procesion":
        out.push([cx - w / 2 + w * t, y, cz + Math.sin(t * Math.PI * 2) * d * 0.25]);
        break;
      default:
        out.push([cx - w / 2 + w * t, y, cz]);
    }
  }
  return out;
}

export function spotsFor(g: Group, c: Site): Vec3[] {
  const h = c.building.plan.layout.heights;
  if (g.place === "torres") {
    const towers = c.building.plan.spaces.filter((s) => s.kind === "tower");
    return Array.from({ length: g.count }, (_, i) => {
      const t = towers[i % Math.max(1, towers.length)];
      const lift = Math.floor(i / Math.max(1, towers.length)) * creatureHeightM(g, c);
      return [(t.rect.x0 + t.rect.x1) / 2, t.height + h.roofSlab + h.towerRoof + lift, (t.rect.z0 + t.rect.z1) / 2];
    });
  }
  if (g.place === "azoteas") {
    const rooms = c.building.plan.spaces.filter((s) => s.kind === "room" || s.kind === "gallery");
    return Array.from({ length: g.count }, (_, i) => {
      const s = rooms[(i * 3) % rooms.length];
      return [(s.rect.x0 + s.rect.x1) / 2, s.height + h.roofSlab, (s.rect.z0 + s.rect.z1) / 2];
    });
  }
  if (g.place === "cielo") return arrangeOnFloor({ ...g, arrangement: g.arrangement === "escalera" ? "escalera" : "circulo" }, c, h.tower * SKY_LIFT);
  if (g.place === "escalera") return arrangeOnFloor({ ...g, arrangement: "escalera" }, c, 0);
  return arrangeOnFloor(g, c, 0);
}

