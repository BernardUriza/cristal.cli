import type { Colonnade, Dome } from "../../domain/architecture/types.ts";
import { polar, star } from "../../domain/geometry.ts";
import { arcLine, archedOpening, halfDisc } from "../../domain/motifs/arches.ts";
import { dotRow, greca } from "../../domain/motifs/bands.ts";
import { radialLines } from "../../domain/motifs/radial.ts";
import { circle, filled, line, polygon, rect, stroked, type Shape } from "../../domain/shapes.ts";
import { ornament, palInks, type Painter } from "../painter.ts";
import { facade } from "../projection.ts";

function domeTier(p: Painter, dome: Dome, cx: number, baseY: number, R: number, sw: number): Shape[] {
  const { pal } = p;
  const out: Shape[] = [halfDisc(cx, baseY, R, filled(pal.primary, pal.ink, Number((sw * 1.4).toFixed(2))))];
  out.push(...radialLines(cx, baseY, R, dome.ribs + 1, ornament(p, palInks(pal, pal.ink, pal.ink, pal.ink), sw * 1.1), Math.PI, Math.PI));
  for (let k = 1; k <= 2; k++) out.push(arcLine(cx, baseY, R * (1 - 0.3 * k), stroked(k === 1 ? pal.accent : pal.secondary, Number((sw * 1.2).toFixed(2)))));
  if (dome.detailLevel > 1 && p.lod.shows(R * 0.1, 4)) {
    for (let i = 0; i < dome.ribs; i++) {
      const a = Math.PI + ((i + 0.5) * Math.PI) / dome.ribs;
      const [sx, sy] = polar(cx, baseY, R * 0.55, a);
      out.push(polygon(star(sx, sy, R * 0.07, R * 0.03, 4, a), filled(pal.accent, pal.ink, Number((sw * 0.5).toFixed(2)), { join: "round" })));
    }
  }
  if (p.art.density > 0.5) {
    for (let i = 0; i <= dome.ribs; i++) {
      const [bx, by] = polar(cx, baseY, R, Math.PI + (i * Math.PI) / dome.ribs);
      out.push(circle(bx, by, R * 0.05, filled(pal.gold, pal.ink, Number((sw * 0.8).toFixed(2)))));
    }
  }
  return out;
}

export function paintDome(p: Painter, col: Colonnade): Shape[] {
  const dome = col.dome;
  if (!dome) return [];
  const { pal } = p;
  const F = facade(p.view, col.z);
  const cx = F.X(dome.x);
  const out: Shape[] = [];
  let R = F.s * dome.r;
  let baseY = F.Y(dome.y);
  const drumH = R * 0.32;
  out.push(rect(cx - R, baseY - drumH, R * 2, drumH, filled(pal.secondary, pal.ink, F.sw)));
  if (p.lod.shows(drumH * 0.3, 6)) out.push(...greca(cx - R, baseY - drumH * 0.3, R * 2, drumH * 0.3, Math.max(4, dome.ribs), ornament(p, palInks(pal, pal.secondary, pal.secondary, pal.accent), F.sw * 0.6)));
  for (let i = 0; i < dome.windows; i++) {
    const wx = cx - R + ((2 * R) / dome.windows) * (i + 0.5);
    const wr = (R / dome.windows) * 0.3;
    out.push(archedOpening(wx, baseY - drumH * 0.55, wr, baseY - drumH * 0.34, filled(pal.deep, pal.ink, Number((F.sw * 0.8).toFixed(2)))));
  }
  baseY -= drumH;
  for (let t = 0; t < dome.tiers; t++) {
    out.push(...domeTier(p, dome, cx, baseY, R, F.sw));
    const lanternH = R * 0.22;
    out.push(rect(cx - R * 0.18, baseY - R - lanternH, R * 0.36, lanternH, filled(pal.gold, pal.ink, F.sw)));
    if (p.lod.shows(lanternH, 8)) out.push(...dotRow(cx - R * 0.18, baseY - R - lanternH / 2, R * 0.36, 3, lanternH * 0.12, pal.ink));
    baseY = baseY - R - lanternH;
    R *= 0.42;
  }
  out.push(line([cx, baseY], [cx, baseY - R * 1.6], stroked(pal.ink, Number((F.sw * 1.6).toFixed(2)))));
  out.push(polygon(star(cx, baseY - R * 1.9, R * 0.5, R * 0.2, 5), filled(pal.accent, pal.ink, F.sw, { join: "round" })));
  return out;
}
