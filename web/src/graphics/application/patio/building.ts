import { PATIO_APRON, PATIO_HEIGHTS, PATIO_LAYOUT, type PatioConfig } from "../../config/patio.ts";
import { CLOISTER_PROGRAM } from "../../config/programs.ts";
import { buildMass, type Building, type Face, type Solid } from "../../domain/architecture/mass.ts";
import { buildPlan, type Plan, type Space } from "../../domain/architecture/plan.ts";
import type { Program } from "../../domain/architecture/program.ts";
import type { Box3, Vec3 } from "../../domain/math/vec3.ts";
import { isometricProjector, type Projector } from "../projector.ts";

const DROPPED_TOWERS = ["torre-nw", "torre-se"];

/** With two towers the corners on the view diagonal become ordinary rooms, so no tower stands in front of the courtyard. */
export function patioProgram(towers: 2 | 4): Program {
  if (towers === 4) return CLOISTER_PROGRAM;
  return { ...CLOISTER_PROGRAM, spaces: CLOISTER_PROGRAM.spaces.map((s) => (DROPPED_TOWERS.includes(s.id) ? { ...s, kind: "room" as const } : s)) };
}

function withHeights(plan: Plan, heights: Record<string, number>): Plan {
  const spaces = plan.spaces.map((s) => (heights[s.id] !== undefined ? { ...s, height: heights[s.id] } : s));
  const byId = new Map(spaces.map((s) => [s.id, s.height]));
  const walls = plan.walls.map((w) => ({ ...w, height: Math.max(byId.get(w.left) ?? 0, byId.get(w.right) ?? 0) }));
  return { ...plan, spaces, walls };
}

export function buildPatioBuilding(config: PatioConfig): Building {
  return buildMass(withHeights(buildPlan(patioProgram(config.towers), PATIO_LAYOUT), PATIO_HEIGHTS));
}

export const FLOAT_RATIO = 0.9;

export function floatingTowerBase(building: Building): number {
  return building.plan.layout.heights.tower * FLOAT_RATIO;
}

function sheetFrame(building: Building, config: PatioConfig): Box3 {
  const { min, max } = building.bounds;
  const h = building.plan.layout.heights;
  const top = config.anomaly === "torre-flotante" ? floatingTowerBase(building) + h.tower + h.roofSlab + h.towerRoof : max[1];
  return { min: [min[0] - PATIO_APRON, min[1], min[2] - PATIO_APRON], max: [max[0] + PATIO_APRON, top, max[2] + PATIO_APRON] };
}

export function patioProjector(building: Building, config: PatioConfig): Projector {
  return isometricProjector(sheetFrame(building, config), { width: config.width, height: config.height, margin: 0.06 }, config.azimuth);
}

export function towers(building: Building): Space[] {
  return building.plan.spaces.filter((s) => s.kind === "tower");
}

export function spaceAt(building: Building, x: number, z: number): Space | undefined {
  return building.plan.spaces.find((s) => x >= s.rect.x0 && x <= s.rect.x1 && z >= s.rect.z0 && z <= s.rect.z1);
}

export function pyramidOver(id: string, footprint: readonly Vec3[], apex: Vec3): Solid {
  const faces: Face[] = [];
  const n = footprint.length;
  for (let i = 0; i < n; i++) {
    const a = footprint[i];
    const b = footprint[(i + 1) % n];
    const e1: Vec3 = [b[0] - a[0], b[1] - a[1], b[2] - a[2]];
    const e2: Vec3 = [apex[0] - a[0], apex[1] - a[1], apex[2] - a[2]];
    const c: Vec3 = [e1[1] * e2[2] - e1[2] * e2[1], e1[2] * e2[0] - e1[0] * e2[2], e1[0] * e2[1] - e1[1] * e2[0]];
    const len = Math.hypot(...c) || 1;
    faces.push({ points: [a, b, apex], normal: [c[0] / len, c[1] / len, c[2] / len] });
  }
  faces.push({ points: [...footprint].reverse(), normal: [0, -1, 0] });
  return { id, tag: { kind: "tower-roof" }, faces };
}
