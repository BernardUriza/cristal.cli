import type { Arch } from "../../domain/architecture/types.ts";
import { polar } from "../../domain/geometry.ts";
import { archedOpening } from "../../domain/motifs/arches.ts";
import { voussoirs } from "../../domain/motifs/arches.ts";
import { fan, rosette } from "../../domain/motifs/radial.ts";
import { filled, line, polygon, rect, solid, stroked, type Shape } from "../../domain/shapes.ts";
import { ornament, palInks, quad, type Painter } from "../painter.ts";
import { facade, type Facade } from "../projection.ts";

function galleryFloorLines(p: Painter, x0: number, x1: number, z0: number, z1: number, y: number, sw: number): Shape[] {
  const out: Shape[] = [];
  for (let k = 1; k <= 4; k++) {
    const z = z0 + ((z1 - z0) * k) / 4;
    out.push(line(p.view.project(x0, y, z), p.view.project(x1, y, z), stroked(p.pal.ink, sw, { opacity: 0.7 })));
  }
  return out;
}

function sideWindows(p: Painter, ccx: number, ccy: number, inner: number, icx: number, inner1: number, fy0: number, fy1: number, icy: number, sw: number): Shape[] {
  const out: Shape[] = [];
  const wy = (ccy + fy0) / 2;
  const wy1 = (icy + fy1) / 2;
  for (let i = 1; i <= 3; i++) {
    const t = i / 4;
    const wyy = wy + (wy1 - wy) * t;
    const wr = (inner - (inner - inner1) * t) * 0.14;
    const wx = ccx - inner + (icx - inner1 - (ccx - inner)) * t;
    const wx2 = ccx + inner - (ccx + inner - (icx + inner1)) * t;
    out.push(archedOpening(wx, wyy - wr, wr, wyy + wr, filled(p.pal.deep, p.pal.ink, sw)));
    out.push(archedOpening(wx2, wyy - wr, wr, wyy + wr, filled(p.pal.deep, p.pal.ink, sw)));
  }
  return out;
}

function galleryEnd(p: Painter, arch: Arch, F: Facade, ccx: number, ccy: number, inner: number, floorY: number): Shape[] {
  const out: Shape[] = [archedOpening(ccx, ccy, inner, F.Y(floorY), filled(p.pal.deep, p.pal.ink, F.sw), arch.pointed)];
  const rr = inner * 0.5;
  if (p.lod.shows(rr, 6)) {
    out.push(...fan(ccx, ccy - inner * 0.1, rr, 12, Math.PI, Math.PI, ornament(p, palInks(p.pal, p.pal.primary, p.pal.accent, p.pal.gold), F.sw * 0.6)));
    out.push(...rosette(ccx, ccy - inner * 0.1, rr * 0.5, 8, ornament(p, palInks(p.pal, p.pal.accent, p.pal.secondary, p.pal.gold), F.sw * 0.7, 2)));
  }
  return out;
}

export function paintOpening(p: Painter, arch: Arch, floorY: number): Shape[] {
  const { view, pal } = p;
  const cx = (arch.x0 + arch.x1) / 2;
  const levels = [0, ...arch.gallery];
  const out: Shape[] = [];
  for (let k = 0; k < levels.length; k++) {
    const z0 = arch.z + levels[k];
    const F0 = facade(view, z0);
    const inner = F0.s * arch.r * 0.78;
    const ccx = F0.X(cx);
    const ccy = F0.Y(arch.y);
    if (k === levels.length - 1) {
      out.push(...galleryEnd(p, arch, F0, ccx, ccy, inner, floorY));
      break;
    }
    const z1 = arch.z + levels[k + 1];
    const F1 = facade(view, z1);
    const inner1 = F1.s * arch.r * 0.78;
    const icx = F1.X(cx);
    const icy = F1.Y(arch.y);
    const fy0 = F0.Y(floorY);
    const fy1 = F1.Y(floorY);
    out.push(archedOpening(ccx, ccy, inner, fy0, solid(pal.wall), arch.pointed));
    out.push(polygon(quad([ccx - inner, ccy], [icx - inner1, icy], [icx - inner1, fy1], [ccx - inner, fy0]), filled(pal.wall, pal.ink, F0.sw * 0.8, { join: "round" })));
    out.push(polygon(quad([ccx + inner, ccy], [icx + inner1, icy], [icx + inner1, fy1], [ccx + inner, fy0]), filled(pal.wall, pal.ink, F0.sw * 0.8, { join: "round" })));
    out.push(polygon(quad([ccx - inner, fy0], [icx - inner1, fy1], [icx + inner1, fy1], [ccx + inner, fy0]), filled(pal.floorB, pal.ink, F0.sw * 0.6, { join: "round" })));
    out.push(...galleryFloorLines(p, cx - arch.r * 0.78, cx + arch.r * 0.78, z0, z1, floorY, F0.sw * 0.6));
    for (let i = 0; i <= arch.ribs; i++) {
      const a = Math.PI + (i * Math.PI) / arch.ribs;
      out.push(line(polar(ccx, ccy, inner, a), polar(icx, icy, inner1, a), stroked(pal.ink, F0.sw * 0.7, { opacity: 0.8 })));
    }
    if (p.lod.shows((fy0 - ccy) * 0.2, 6)) out.push(...sideWindows(p, ccx, ccy, inner, icx, inner1, fy0, fy1, icy, F0.sw * 0.6));
    out.push(rect(icx - inner1, icy, inner1 * 2, fy1 - icy, solid(pal.wall)));
    out.push(...voussoirs(icx, icy, inner1, (inner1 / 0.78) * 0.92, arch.galleryVoussoirs, ornament(p, palInks(pal, pal.secondary, pal.wall, pal.accent), F1.sw * 0.7, 1)));
  }
  return out;
}
