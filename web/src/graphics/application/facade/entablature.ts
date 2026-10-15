import type { Colonnade } from "../../domain/architecture/types.ts";
import { greca } from "../../domain/motifs/bands.ts";
import { rosette } from "../../domain/motifs/radial.ts";
import { filled, line, polygon, rect, stroked, type Shape } from "../../domain/shapes.ts";
import { ornament, palInks, quad, type Painter } from "../painter.ts";
import { facade } from "../projection.ts";
import { colonnadeCenter } from "./wall.ts";

const CORNICE_H = 0.16;

export function paintEntablature(p: Painter, col: Colonnade): Shape[] {
  const { view, pal } = p;
  const { halfWidth, entablature: e, z, depth } = col;
  const xc = colonnadeCenter(col);
  const F = facade(view, z);
  const out: Shape[] = [];
  out.push(polygon(quad(view.project(xc - halfWidth, e.y, z), view.project(xc + halfWidth, e.y, z), view.project(xc + halfWidth, e.y, z + depth), view.project(xc - halfWidth, e.y, z + depth)), filled(pal.secondary, pal.ink, F.sw, { join: "round" })));
  for (let i = 0; i < e.triglyphs; i++) {
    const x0 = xc - halfWidth + ((halfWidth * 2) / e.triglyphs) * (i + 0.2);
    const x1 = xc - halfWidth + ((halfWidth * 2) / e.triglyphs) * (i + 0.8);
    out.push(polygon(quad(view.project(x0, e.y, z + depth * 0.2), view.project(x1, e.y, z + depth * 0.2), view.project(x1, e.y, z + depth * 0.8), view.project(x0, e.y, z + depth * 0.8)), filled(i % 2 ? pal.gold : pal.deep, pal.ink, F.sw * 0.6, { join: "round" })));
  }
  if (xc !== 0) {
    const sideX = xc > 0 ? xc - halfWidth : xc + halfWidth;
    out.push(polygon(quad(view.project(sideX, e.y + e.h, z), view.project(sideX, e.y + e.h, z + depth), view.project(sideX, e.y, z + depth), view.project(sideX, e.y, z)), filled(pal.primary, pal.ink, F.sw, { join: "round" })));
  }
  out.push(rect(F.X(xc - halfWidth), F.Y(e.y + e.h), F.s * halfWidth * 2, F.s * e.h, filled(pal.gold, pal.ink, F.sw)));
  const pitch = (halfWidth * 2) / e.triglyphs;
  for (let i = 0; i < e.triglyphs; i++) {
    const gx = F.X(xc - halfWidth + i * pitch + pitch * 0.25);
    const even = (i % 2 === 0) !== (i === e.flipped);
    const gw = F.s * pitch * 0.5;
    const gh = F.s * e.h * 0.6;
    const gy = F.Y(e.y + e.h * 0.8);
    if (even) {
      out.push(rect(gx, gy, gw, gh, filled(pal.ink, pal.ink, F.sw * 0.6)));
      if (p.lod.shows(gh, 8)) for (let k = 1; k <= 2; k++) out.push(line([gx + (gw / 3) * k, gy], [gx + (gw / 3) * k, gy + gh], stroked(pal.gold, F.sw)));
    } else if (p.lod.shows(gh, 8)) {
      out.push(...rosette(gx + gw / 2, gy + gh / 2, gh * 0.45, 8, ornament(p, palInks(pal, pal.secondary, pal.primary, pal.accent), F.sw * 0.6, e.rosetteLevel)));
    } else {
      out.push(rect(gx, gy, gw, gh, filled(pal.secondary, pal.ink, F.sw * 0.6)));
    }
  }
  const cw = F.s * (halfWidth + 0.3) * 2;
  out.push(rect(F.X(xc - halfWidth - 0.3), F.Y(e.y + e.h + CORNICE_H), cw, F.s * CORNICE_H, filled(pal.primary, pal.ink, F.sw)));
  if (p.lod.shows(F.s * CORNICE_H, 9)) out.push(...greca(F.X(xc - halfWidth - 0.3), F.Y(e.y + e.h + CORNICE_H) + 1, cw, F.s * CORNICE_H - 2, e.triglyphs * 2, ornament(p, palInks(pal, pal.primary, pal.primary, pal.accent), F.sw * 0.6)));
  return out;
}
