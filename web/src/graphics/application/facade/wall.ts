import type { Arch, Colonnade } from "../../domain/architecture/types.ts";
import { star } from "../../domain/geometry.ts";
import { archedOpening, nestedArches, pointedRing, voussoirs } from "../../domain/motifs/arches.ts";
import { fan } from "../../domain/motifs/radial.ts";
import { circle, filled, line, polygon, rect, stroked, type Shape } from "../../domain/shapes.ts";
import { ornament, palInks, type Painter } from "../painter.ts";
import { facade } from "../projection.ts";

export function paintArchRing(p: Painter, arch: Arch): Shape[] {
  const { pal } = p;
  const F = facade(p.view, arch.z);
  const cx = F.X((arch.x0 + arch.x1) / 2);
  const cy = F.Y(arch.y);
  const R = F.s * arch.r;
  const rIn = R * 0.78;
  if (arch.pointed) {
    return [
      pointedRing(cx, cy, R, rIn, filled(pal.accent, pal.ink, Number((F.sw * 1.4).toFixed(2)))),
      ...nestedArches(cx, cy, R, arch.nestedRings, ornament(p, palInks(pal, pal.primary, pal.secondary, pal.accent), F.sw * 1.6), true),
    ];
  }
  return [
    ...voussoirs(cx, cy, rIn, R, arch.voussoirs, ornament(p, palInks(pal, pal.primary, pal.secondary, pal.gold), F.sw, arch.detailLevel)),
    ...nestedArches(cx, cy, rIn, arch.nestedRings, ornament(p, palInks(pal, pal.primary, pal.secondary, pal.accent), F.sw * 1.2)),
  ];
}

export function colonnadeCenter(col: Colonnade): number {
  return (col.columns[0].x + col.columns[col.columns.length - 1].x) / 2;
}

export function paintSpandrelWall(p: Painter, col: Colonnade): Shape[] {
  const { pal } = p;
  const F = facade(p.view, col.z);
  const { halfWidth, entablature } = col;
  const xc = colonnadeCenter(col);
  const out: Shape[] = [rect(F.X(xc - halfWidth), F.Y(entablature.y), F.s * halfWidth * 2, F.s * (entablature.y - col.floorY), filled(pal.wall, pal.ink, F.sw))];
  const spandrelInk = ornament(p, palInks(pal, pal.accent, pal.wall, pal.gold), F.sw * 0.6);
  for (const a of col.arches) {
    const r = F.s * a.r * 0.5;
    if (!p.lod.shows(r, 8)) continue;
    out.push(...fan(F.X(a.x0), F.Y(a.y), r, col.fanRays, -Math.PI / 2, Math.PI / 2, spandrelInk));
    out.push(...fan(F.X(a.x1), F.Y(a.y), r, col.fanRays, Math.PI, Math.PI / 2, spandrelInk));
  }
  for (const w of col.windows) {
    const wx = F.X(w.x);
    const wr = F.s * w.r;
    const wy = F.Y(w.y + w.r);
    if (w.star) {
      out.push(polygon(star(wx, wy, wr * 1.3, wr * 0.55, 8), filled(pal.deep, pal.ink, F.sw, { join: "round" })));
      out.push(circle(wx, wy, wr * 0.4, filled(pal.accent, pal.ink, F.sw)));
      continue;
    }
    const sill = F.Y(w.y - w.r * 0.2);
    out.push(archedOpening(wx, wy, wr, sill, filled(pal.deep, pal.ink, F.sw)));
    if (p.lod.shows(wr, 7)) out.push(...voussoirs(wx, wy, wr, wr * 1.35, 5, ornament(p, palInks(pal, pal.primary, pal.secondary, pal.gold), F.sw * 0.6, 1)));
    if (w.mullion && p.lod.shows(wr, 10)) out.push(line([wx, wy], [wx, sill], stroked(pal.ink, F.sw)));
  }
  return out;
}
