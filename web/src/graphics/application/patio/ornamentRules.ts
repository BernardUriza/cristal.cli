import type { OrnamentLanguage, PatioConfig } from "../../config/patio.ts";
import { chevronBand, greca } from "../../domain/motifs/bands.ts";
import type { Ornament } from "../../domain/motifs/ornament.ts";
import { filled, polygon, rect, stroked, type Shape, type Vec2 } from "../../domain/shapes.ts";

const BAND_FALLBACK: readonly OrnamentLanguage[] = ["greca", "chevrón", "ajedrez"];

export function enabled(cfg: PatioConfig, lang: OrnamentLanguage): boolean {
  return cfg.ornament.includes(lang);
}

export function bandLanguage(cfg: PatioConfig, preferred: OrnamentLanguage): OrnamentLanguage | undefined {
  if (enabled(cfg, preferred)) return preferred;
  return BAND_FALLBACK.find((l) => enabled(cfg, l));
}

export function cellSize(cfg: PatioConfig): number {
  return 1.1 - 0.65 * cfg.density;
}

export function cellsFor(cfg: PatioConfig, width: number): number {
  return Math.max(2, Math.round(width / cellSize(cfg)));
}

export function checkerBand(x: number, y: number, w: number, h: number, cells: number, o: Ornament): Shape[] {
  const u = w / cells;
  const out: Shape[] = [rect(x, y, w, h, filled(o.ink.b, o.ink.ink, o.sw))];
  for (let i = 0; i < cells; i++) for (let r = 0; r < 2; r++) if ((i + r) % 2 === 0) out.push(rect(x + i * u, y + (r * h) / 2, u, h / 2, { fill: o.ink.a }));
  return out;
}

export function band(lang: OrnamentLanguage | undefined, x: number, y: number, w: number, h: number, cells: number, o: Ornament, dots = false): Shape[] {
  switch (lang) {
    case "greca": return greca(x, y, w, h, cells, o);
    case "chevrón": return chevronBand(x, y, w, h, cells, o, dots);
    case "ajedrez": return checkerBand(x, y, w, h, cells, o);
    default: return [];
  }
}

/** Blind window: a filled recess with a round or pointed head, drawn in metres with y down. */
export function blindWindow(cx: number, top: number, w: number, h: number, pointed: boolean, o: Ornament, inner: boolean): Shape[] {
  const r = w / 2;
  const head: Vec2[] = [];
  const steps = 6;
  for (let i = 0; i <= steps; i++) {
    const a = Math.PI + (i * Math.PI) / steps;
    const lift = pointed ? r * 0.35 * Math.sin((i * Math.PI) / steps) : 0;
    head.push([cx + r * Math.cos(a), top + r + r * Math.sin(a) - lift]);
  }
  const pts: Vec2[] = [[cx - r, top + h], [cx - r, top + r], ...head, [cx + r, top + h]];
  const out: Shape[] = [polygon(pts, filled(o.ink.c, o.ink.ink, o.sw))];
  if (inner) out.push(polygon(pts.map((p): Vec2 => [cx + (p[0] - cx) * 0.7, top + h - (top + h - p[1]) * 0.75]), stroked(o.ink.ink, o.sw * 0.8, { opacity: 0.8 })));
  return out;
}
