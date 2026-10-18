import type { Column } from "../../domain/architecture/types.ts";
import { chevronCells, dotRow, flutes, grecaBand, helixBand } from "../../domain/motifs/bands.ts";
import { facadeBand } from "./bandCut.ts";
import { rosette, volutePair } from "../../domain/motifs/radial.ts";
import { filled, rect, type Shape } from "../../domain/shapes.ts";
import { ornament, palInks, type Painter } from "../painter.ts";
import { facade } from "../projection.ts";

const BASE_H = 0.14;
const CAPITAL_H = 0.32;

export function paintColumn(p: Painter, col: Column, floorY: number): Shape[] {
  const { pal } = p;
  const F = facade(p.view, col.z);
  const { x, h, r } = col;
  const sw = F.sw;
  const out: Shape[] = [];
  const id = `columna ${x.toFixed(2)}@${col.z.toFixed(2)}`;
  out.push(rect(F.X(x - r * 1.8), F.Y(floorY + BASE_H), F.s * r * 3.6, F.s * BASE_H, filled(pal.gold, pal.ink, sw)));
  if (p.lod.shows(F.s * BASE_H, 8)) out.push(...facadeBand(p, id, "basa", 4, (d) => grecaBand(F.X(x - r * 1.8), F.Y(floorY + BASE_H) + 1, F.s * r * 3.6, F.s * BASE_H - 2, 4, ornament(p, palInks(pal, pal.gold, pal.gold, pal.accent), sw * 0.6), d)));
  out.push(rect(F.X(x - r * 1.4), F.Y(floorY + BASE_H * 2), F.s * r * 2.8, F.s * BASE_H, filled(pal.secondary, pal.ink, sw)));
  const shaftY0 = floorY + BASE_H * 2;
  const shaftY1 = h - CAPITAL_H;
  const sx = F.X(x - r);
  const sw2 = F.s * r * 2;
  const sy = F.Y(shaftY1);
  const sh = F.s * (shaftY1 - shaftY0);
  if (col.shaft.kind === "helix") {
    out.push(...helixBand(sx, sy, sw2, sh, col.shaft.turns, ornament(p, palInks(pal, pal.secondary, pal.primary, pal.accent), sw)));
  } else {
    const bh = sh / col.shaft.bands;
    const dotted = col.shaft.dottedChevrons;
    for (let i = 0; i < col.shaft.bands; i++) {
      const y = sy + i * bh;
      if (i % 2 === 0) {
        out.push(rect(sx, y, sw2, bh, filled(pal.primary, pal.ink, sw * 0.8)));
        out.push(...flutes(sx, y, sw2, bh, col.shaft.flutes, ornament(p, palInks(pal, pal.primary, pal.primary, pal.primary), sw * 0.7)));
      } else if (p.lod.shows(bh, 7)) {
        out.push(...facadeBand(p, id, `fuste ${i}`, 3, (d) => chevronCells(sx, y, sw2, bh, 3, ornament(p, palInks(pal, pal.accent, pal.secondary, pal.primary), sw * 0.6), dotted && p.lod.shows(bh, 14), d)));
      } else {
        out.push(rect(sx, y, sw2, bh, filled(pal.accent, pal.ink, sw * 0.8)));
      }
    }
  }
  const capY = F.Y(h);
  const capH = F.s * CAPITAL_H;
  out.push(rect(F.X(x - r * 1.5), capY, F.s * r * 3, capH, filled(pal.secondary, pal.ink, sw)));
  if (p.lod.shows(capH, 9)) out.push(...dotRow(F.X(x - r * 1.5), capY + capH * 0.8, F.s * r * 3, 5, capH * 0.08, pal.ink));
  out.push(...volutePair(F.X(x), F.Y(h - 0.1), F.s * r * 0.55, ornament(p, palInks(pal, pal.secondary, pal.primary, pal.accent), sw, col.capital.voluteLevel)));
  if (col.capital.rosette && p.lod.shows(capH, 10)) out.push(...rosette(F.X(x), capY + capH * 0.42, capH * 0.3, 6, ornament(p, palInks(pal, pal.accent, pal.primary, pal.gold), sw * 0.6, 2)));
  return out;
}
