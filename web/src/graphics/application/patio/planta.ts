import { PATIO_APRON } from "../../config/patio.ts";
import { openingSpan, type Space } from "../../domain/architecture/plan.ts";
import { regularPolygon } from "../../domain/geometry.ts";
import { filled, line, polygon, polyline, rect, solid, stroked, type Shape, type Style, type Vec2 } from "../../domain/shapes.ts";
import type { Stage } from "../compose.ts";
import { boxOn, siteEvidence } from "../siteEvidence.ts";
import { paintFaces } from "../drawings/faces.ts";
import { visibleFaces } from "./surfaces.ts";
import type { PatioContext } from "./types.ts";

const TILE = 1;
const GRID = 2;

function ground(ctx: PatioContext, x: number, z: number, y = 0): Vec2 {
  return ctx.projector.toScreen([x, y, z]);
}

function groundPolygon(ctx: PatioContext, pts: readonly Vec2[], style: Style, y = 0): Shape {
  return polygon(pts.map((p) => ground(ctx, p[0], p[1], y)), style);
}

function apron(ctx: PatioContext): Shape[] {
  const b = ctx.building.plan.bounds;
  const A = PATIO_APRON;
  const [x0, z0, x1, z1] = [b.x0 - A, b.z0 - A, b.x1 + A, b.z1 + A];
  const out: Shape[] = [groundPolygon(ctx, [[x0, z0], [x0, z1], [x1, z1], [x1, z0]], filled(ctx.pal.wall, ctx.pal.ink, 0.6, { opacity: 0.45 }))];
  const grid = stroked(ctx.pal.ink, 0.45, { opacity: 0.3 });
  for (let x = Math.ceil(x0 / GRID) * GRID; x <= x1; x += GRID) out.push(line(ground(ctx, x, z0), ground(ctx, x, z1), grid));
  for (let z = Math.ceil(z0 / GRID) * GRID; z <= z1; z += GRID) out.push(line(ground(ctx, x0, z), ground(ctx, x1, z), grid));
  const ring = ctx.building.plan.layout.walls.exterior / 2;
  for (let x = b.x0 - ring; x < b.x1 + ring - 1e-6; x += 1) for (const z of [b.z0 - ring - 1, b.z1 + ring]) out.push(groundPolygon(ctx, [[x, z], [x + 1, z], [x + 1, z + 1], [x, z + 1]], filled(Math.round(x + z) % 2 === 0 ? ctx.pal.floorA : ctx.pal.floorB, ctx.pal.ink, 0.35)));
  for (let z = b.z0 - ring - 1; z < b.z1 + ring + 1 - 1e-6; z += 1) for (const x of [b.x0 - ring - 1, b.x1 + ring]) out.push(groundPolygon(ctx, [[x, z], [x + 1, z], [x + 1, z + 1], [x, z + 1]], filled(Math.round(x + z) % 2 === 0 ? ctx.pal.floorA : ctx.pal.floorB, ctx.pal.ink, 0.35)));
  const half = ctx.building.plan.layout.vestibuleWidth / 2 - 0.8;
  out.push(groundPolygon(ctx, [[-half, b.z1], [half, b.z1], [half, z1], [-half, z1]], filled(ctx.pal.floorB, ctx.pal.ink, 0.7)));
  for (let z = b.z1 + 1; z < z1; z += 1) out.push(line(ground(ctx, -half, z), ground(ctx, half, z), stroked(ctx.pal.ink, 0.5)));
  return out;
}

export function courtyardTiles(ctx: PatioContext, patio: Pick<Space, "rect">, y = 0, tile = TILE): Shape[] {
  const r = patio.rect;
  const nx = Math.max(1, Math.round((r.x1 - r.x0) / tile));
  const nz = Math.max(1, Math.round((r.z1 - r.z0) / tile));
  const tx = (r.x1 - r.x0) / nx;
  const tz = (r.z1 - r.z0) / nz;
  const flips = new Set<string>();
  for (let k = 0; k < Math.round(ctx.config.density * 4); k++) flips.add(`${Math.floor(ctx.rng() * nx)}:${Math.floor(ctx.rng() * nz)}`);
  const out: Shape[] = [];
  for (let j = nz - 1; j >= 0; j--) {
    for (let i = 0; i < nx; i++) {
      const dark = ((i + j) % 2 === 0) !== flips.has(`${i}:${j}`);
      const x = r.x0 + i * tx;
      const z = r.z0 + j * tz;
      const q: Vec2[] = [ground(ctx, x, z, y), ground(ctx, x + tx, z, y), ground(ctx, x + tx, z + tz, y), ground(ctx, x, z + tz, y)];
      out.push(polygon(q, filled(dark ? ctx.pal.floorA : ctx.pal.floorB, ctx.pal.ink, 0.3, { join: "round" })));
      const px = Math.hypot(q[1][0] - q[0][0], q[1][1] - q[0][1]);
      if (!dark && ctx.config.density >= 0.5 && ctx.lod.shows(px, 9)) {
        const m = (a: Vec2, b: Vec2): Vec2 => [(a[0] + b[0]) / 2, (a[1] + b[1]) / 2];
        out.push(polygon([m(q[0], q[1]), m(q[1], q[2]), m(q[2], q[3]), m(q[3], q[0])], filled(ctx.pal.primary, ctx.pal.ink, 0.3)));
      }
    }
  }
  const cx = (r.x0 + r.x1) / 2;
  const cz = (r.z0 + r.z1) / 2;
  out.push(groundPolygon(ctx, regularPolygon(cx, cz, 2.4, 24), filled(ctx.pal.secondary, ctx.pal.ink, 0.8, { opacity: 0.85 }), y));
  out.push(groundPolygon(ctx, regularPolygon(cx, cz, 1.7, 24), filled(ctx.pal.bg, ctx.pal.ink, 0.6), y));
  return out;
}

function centre(s: Space): Vec2 {
  return [(s.rect.x0 + s.rect.x1) / 2, (s.rect.z0 + s.rect.z1) / 2];
}

function routes(ctx: PatioContext): Shape[] {
  const { plan } = ctx.building;
  const byId = new Map(plan.spaces.map((s) => [s.id, s]));
  const outside: Vec2 = [0, plan.bounds.z1 + PATIO_APRON - 1];
  const out: Shape[] = plan.spaces.map((s) => groundPolygon(ctx, [[s.rect.x0, s.rect.z0], [s.rect.x0, s.rect.z1], [s.rect.x1, s.rect.z1], [s.rect.x1, s.rect.z0]], stroked(ctx.pal.ink, 0.7, { opacity: 0.5 })));
  const way = stroked(ctx.pal.primary, 0.9, { opacity: 0.8, join: "round" });
  for (const o of plan.openings) {
    const wall = plan.walls.find((w) => w.id === o.wallId)!;
    const mid = openingSpan(wall, o).center;
    const ends = o.between.map((id) => (byId.has(id) ? centre(byId.get(id)!) : outside));
    out.push(polyline([ground(ctx, ends[0][0], ends[0][1]), ground(ctx, mid[0], mid[1]), ground(ctx, ends[1][0], ends[1][1])], way));
  }
  for (const s of plan.spaces) out.push(groundPolygon(ctx, regularPolygon(centre(s)[0], centre(s)[1], 0.35, 8), filled(ctx.pal.primary, ctx.pal.ink, 0.5)));
  return out;
}

function declaredTop(ctx: PatioContext): number {
  const h = ctx.building.plan.layout.heights;
  return Math.max(...ctx.building.plan.spaces.map((s) => s.height + h.roofSlab + (s.kind === "tower" ? h.towerRoof : 0)));
}

export function planta(ctx: PatioContext): Stage {
  const patio = ctx.building.plan.spaces.find((s) => s.kind === "courtyard")!;
  const slab = paintFaces(visibleFaces(ctx).filter((f) => f.solid.tag.kind === "floor"), ctx.projector, ctx.style);
  const tiles = courtyardTiles(ctx, patio);
  const paths = routes(ctx);
  const shapes: Shape[] = [rect(0, 0, ctx.config.width, ctx.config.height, solid(ctx.pal.bg)), ...apron(ctx), ...slab, ...tiles, ...paths];
  const flipped = Math.round(ctx.config.density * 4);
  return {
    name: "planta",
    shapes,
    provenance: {
      algorithm: "planta real proyectada sobre y=0: explanada con retícula, cenefa de ajedrez alrededor del zócalo, ajedrez del patio por baldosa, contorno de cada espacio y grafo de recorridos por cada hueco",
      params: { baldosa_m: TILE, reticula_m: GRID, explanada_m: PATIO_APRON, baldosas_invertidas: flipped, recorridos: ctx.building.plan.openings.length },
      decision: "el suelo organiza la composición: se lee como mapa (nodos en el centro de cada espacio, caminos por los huecos, avenida de entrada); los rombos aparecen con density ≥ 0.5",
      site: siteEvidence("patio", boxOn(ctx.building.plan.bounds, 0, declaredTop(ctx)), ctx.projector.toScreen),
    },
  };
}
