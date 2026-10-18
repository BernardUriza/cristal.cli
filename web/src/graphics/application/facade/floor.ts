import type { Floor, Platform } from "../../domain/architecture/types.ts";
import { grecaBand } from "../../domain/motifs/bands.ts";
import { facadeBand } from "./bandCut.ts";
import { midpoint } from "../../domain/geometry.ts";
import { ellipse, filled, polygon, type Shape } from "../../domain/shapes.ts";
import { ornament, palInks, quad, type Painter } from "../painter.ts";
import { facade } from "../projection.ts";

export function paintFloor(p: Painter, floor: Floor): Shape[] {
  const { view, pal } = p;
  const { tile, xMin, xMax, zMin, zMax } = floor;
  const out: Shape[] = [];
  for (let z = zMax; z > zMin; z -= tile) {
    const zi = Math.round(z / tile);
    for (let x = xMin; x < xMax; x += tile) {
      const xi = Math.round(x / tile);
      const dark = (xi + zi) % 2 === 0;
      const q = quad(view.project(x, 0, z), view.project(x + tile, 0, z), view.project(x + tile, 0, z - tile), view.project(x, 0, z - tile));
      out.push(polygon(q, filled(dark ? pal.floorA : pal.floorB, pal.ink, 0.6, { join: "round" })));
      const px = q[1][0] - q[0][0];
      if (floor.diamonds && !dark && p.lod.shows(px, 8)) {
        out.push(polygon(quad(midpoint(q[0], q[1]), midpoint(q[1], q[2]), midpoint(q[2], q[3]), midpoint(q[3], q[0])), filled(pal.primary, pal.ink, 0.5, { join: "round" })));
      }
      if (floor.discs && dark && p.lod.shows(px, 14)) {
        const zc = z - tile / 2;
        const [cx, cy] = view.project(x + tile / 2, 0, zc);
        const rx = view.scaleAt(zc) * tile * 0.18;
        out.push(ellipse(cx, cy, rx, (rx * view.camH) / zc, filled(pal.accent, pal.ink, 0.5)));
      }
    }
  }
  return out;
}

export function paintPlatform(p: Painter, platform: Platform): Shape[] {
  const { view, pal } = p;
  const { halfWidth, z, depth, steps, stepHeight } = platform;
  const out: Shape[] = [];
  for (let i = 0; i < steps; i++) {
    const hw = halfWidth + (steps - 1 - i) * 0.6;
    const d = depth + (steps - 1 - i) * 0.6;
    const y0 = i * stepHeight;
    const y1 = y0 + stepHeight;
    const even = i % 2 === 0;
    out.push(polygon(quad(view.project(-hw, y1, z + d), view.project(hw, y1, z + d), view.project(hw, y1, z), view.project(-hw, y1, z)), filled(even ? pal.secondary : pal.gold, pal.ink, 0.9, { join: "round" })));
    out.push(polygon(quad(view.project(-hw, y1, z), view.project(hw, y1, z), view.project(hw, y0, z), view.project(-hw, y0, z)), filled(even ? pal.gold : pal.secondary, pal.ink, 0.9, { join: "round" })));
    const F = facade(view, z);
    if (p.lod.shows(F.s * stepHeight, 10)) {
      out.push(...facadeBand(p, "plataforma", `escalón ${i}`, Math.round((hw * 2) / 0.6), (d) => grecaBand(F.X(-hw), F.Y(y1) + 1, F.s * hw * 2, F.s * stepHeight - 2, Math.round((hw * 2) / 0.6), ornament(p, palInks(pal, pal.gold, even ? pal.gold : pal.secondary, pal.accent), 0.5), d)));
    }
  }
  return out;
}
