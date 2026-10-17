import type { Group, Scene } from "../../config/scene.ts";
import type { Palette } from "../../config/palettes.ts";
import type { Vec3 } from "../../domain/math/vec3.ts";
import { drawCreature } from "../../domain/motifs/figures/creature.ts";
import type { MotifParams } from "../../domain/motifs/figures/types.ts";
import type { Shape } from "../../domain/shapes.ts";
import { mulberry32 } from "../../../shared/rng.ts";
import type { Stage } from "../compose.ts";
import type { PatioComposition } from "./types.ts";

type Spot = { at: Vec3; group: number };

const STEP_RISE = 0.35;
const SKY_LIFT = 1.25;
const PROTAGONIST = 0.34;
const MIN_HEIGHT_M = 3;

function courtyard(c: PatioComposition) {
  return c.building.plan.spaces.find((s) => s.kind === "courtyard")!.rect;
}

export function creatureHeightM(g: Group, c: PatioComposition): number {
  const r = courtyard(c);
  const court = Math.min(r.x1 - r.x0, r.z1 - r.z0);
  return Math.max(MIN_HEIGHT_M, (court * PROTAGONIST * g.scale) / Math.max(1, Math.sqrt(g.count) / 2));
}

function arrangeOnFloor(g: Group, c: PatioComposition, y: number): Vec3[] {
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

function spotsFor(g: Group, c: PatioComposition): Vec3[] {
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

function depth(c: PatioComposition, p: Vec3): number {
  return c.projector.toNdc(p)[2];
}

export function poblado(c: PatioComposition, scene: Scene, pal: Palette, detail: MotifParams["detail"], seed: number): Stage {
  const spots: Spot[] = scene.groups.flatMap((g, gi) => spotsFor(g, c).map((at) => ({ at, group: gi })));
  spots.sort((a, b) => depth(c, b.at) - depth(c, a.at));
  const shapes: Shape[] = [];
  const rng = mulberry32(seed ^ 0x9e3779b1);
  const params = { detail, fill: pal.bg, ink: pal.ink, accent: pal.primary };
  for (const spot of spots) {
    const g = scene.groups[spot.group];
    const foot = c.projector.toScreen(spot.at);
    const head = c.projector.toScreen([spot.at[0], spot.at[1] + creatureHeightM(g, c), spot.at[2]]);
    const heightPx = Math.max(8, Math.hypot(head[0] - foot[0], head[1] - foot[1]));
    shapes.push(...drawCreature(g.creature.parts, foot[0], foot[1], heightPx, params, rng).shapes);
  }
  const summary = scene.groups.map((g) => `${g.count} ${g.creature.name} (${Object.entries(g.creature.parts).map(([k, v]) => `${k}=${v}`).join(" ")}) en ${g.arrangement} · ${g.place}`);
  return {
    name: "figuras",
    shapes,
    provenance: {
      algorithm: "escena del director: criaturas compuestas con partes de la pared, colocadas en METROS sobre la arquitectura (patio, azoteas, torres, cielo, escalera) y proyectadas con el mismo proyector isométrico; painter's por profundidad",
      params: { grupos: scene.groups.length, figuras: spots.length, arquitectura: `${scene.architecture.footprint}/${scene.architecture.courtyard}/${scene.architecture.heights}` },
      decision: summary.join("; ") || "sin figuras en la escena",
    },
  };
}
