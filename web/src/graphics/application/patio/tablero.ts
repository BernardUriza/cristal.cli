import { greca, grecaBand, type BandDrawing } from "../../domain/motifs/bands.ts";
import type { DisorderInput } from "../../domain/motifs/disorder.ts";
import type { Ornament } from "../../domain/motifs/ornament.ts";
import { filled, rect, stroked, type Shape } from "../../domain/shapes.ts";

const NICHE_STEP = 1.6;

const PANEL_M = 5;

export type BandCut = (name: string, cells: number, draw: (d?: DisorderInput) => BandDrawing) => Shape[];

const undisturbed: BandCut = (_name, _cells, draw) => draw().shapes;

/** Teotihuacan tablero: moulded frames around recessed panels some five metres long, each carrying a greca when the detail allows. */
export function tableroPanel(w: number, h: number, o: Ornament, cellSize: number, withGreca: boolean, cut: BandCut = undisturbed): Shape[] {
  const m = Math.min(0.3, h * 0.18);
  const n = Math.max(1, Math.round(w / PANEL_M));
  const pw = w / n;
  const out: Shape[] = [];
  for (let i = 0; i < n; i++) {
    const x = i * pw;
    out.push(rect(x + m, m, pw - 2 * m, h - 2 * m, filled(o.ink.b, o.ink.ink, o.sw)));
    if (withGreca && o.level >= 2 && o.shows(h - 4 * m, 4)) {
      const cells = Math.max(2, Math.round((pw - 4 * m) / cellSize));
      out.push(...cut(`tablero ${i}`, cells, (d) => grecaBand(x + 2 * m, 2 * m, pw - 4 * m, h - 4 * m, cells, o, d)));
    }
  }
  return out;
}

/** El Tajín: a row of square niches, each a deep recess framed by its own moulding; at full detail a fret steps inside. */
export function nicheRow(w: number, h: number, o: Ornament): Shape[] {
  const side = Math.min(h * 0.7, NICHE_STEP * 0.65);
  if (!o.shows(side, 4)) return [];
  const n = Math.max(1, Math.floor(w / NICHE_STEP));
  const top = (h - side) / 2;
  const out: Shape[] = [];
  for (let i = 0; i < n; i++) {
    const x = (w / n) * (i + 0.5) - side / 2;
    out.push(rect(x - side * 0.12, top - side * 0.12, side * 1.24, side * 1.24, stroked(o.ink.ink, o.sw)));
    out.push(rect(x, top, side, side, filled(o.ink.c, o.ink.ink, o.sw)));
    if (o.level >= 3 && o.shows(side * 0.5, 4)) out.push(...greca(x + side * 0.2, top + side * 0.55, side * 0.6, side * 0.3, 1, o));
  }
  return out;
}
