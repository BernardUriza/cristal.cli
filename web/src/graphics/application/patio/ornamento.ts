import { dotRow, flutes } from "../../domain/motifs/bands.ts";
import { inks, type Ink, type Ornament } from "../../domain/motifs/ornament.ts";
import { rosette, sierpinski } from "../../domain/motifs/radial.ts";
import type { Shape } from "../../domain/shapes.ts";
import { chance } from "../../../shared/rng.ts";
import type { Stage } from "../compose.ts";
import { mapShapes } from "./frame.ts";
import { band, bandLanguage, blindWindow, cellsFor, enabled } from "./ornamentRules.ts";
import type { Surface } from "./surfaces.ts";
import type { PatioContext } from "./types.ts";
import type { Decor } from "./friso.ts";
import type { RewriteRecord } from "../../domain/rewrite/rewrite.ts";

const STOREY_M = 3;

const TOWER_COURSE_M = 4;

function ornamentOn(s: Surface, ctx: PatioContext, ink: Ink): Ornament {
  const pxPerM = s.px.w / Math.max(s.frame.width, 1e-6);
  return { ink, sw: ctx.style.edgeWidth * 0.7, level: ctx.config.detail, shows: (m, min) => ctx.lod.shows(m * pxPerM, min) };
}

function exteriorWall(s: Surface, ctx: PatioContext, frieze: boolean): Shape[] {
  const { width: w, height: h } = s.frame;
  const { pal, config } = ctx;
  const o = ornamentOn(s, ctx, inks(pal.ink, pal.secondary, pal.bg, pal.deep));
  const cells = cellsFor(config, w);
  const out: Shape[] = [];
  if (!frieze && o.shows(0.5, 4)) out.push(...band(bandLanguage(config, "greca"), 0, 0.25, w, 0.5, cells, o));
  if (!frieze && config.detail >= 3 && o.shows(0.16, 3)) out.push(...dotRow(0, 1.0, w, cells, 0.07, pal.ink));
  if (config.detail >= 2 && h >= 3 && o.shows(1.4, 8)) {
    const n = Math.max(1, Math.floor(w / 2.4));
    const pointed = chance(ctx.rng, 0.5);
    const storeys = Math.max(1, Math.floor((h - 3.8) / STOREY_M) + 1);
    for (let k = 0; k < storeys; k++) for (let i = 0; i < n; i++) out.push(...blindWindow((w / n) * (i + 0.5), h - 2.6 - k * STOREY_M, 0.9, 1.4, pointed, o, config.detail >= 3));
  }
  return out;
}

function towerWall(s: Surface, ctx: PatioContext): Shape[] {
  const { width: w, height: h } = s.frame;
  const { pal, config } = ctx;
  const o = ornamentOn(s, ctx, inks(pal.ink, pal.primary, pal.bg, pal.gold));
  const out: Shape[] = [];
  const count = Math.max(2, cellsFor(config, w) - 1);
  if (enabled(config, "estrías") && o.shows((w - 0.6) / (count + 1), 5)) out.push(...flutes(0.3, 1.2, w - 0.6, h - 2.4, count, o));
  const r = Math.min(w, 4) * 0.28;
  if (config.detail >= 2 && enabled(config, "roseta") && o.shows(r * 2, 10)) out.push(...rosette(w / 2, 1.5 + r, r, 8, o));
  if (config.detail >= 3 && o.shows(0.4, 4)) out.push(...band(bandLanguage(config, "greca"), 0, 0.2, w, 0.4, cellsFor(config, w), o));
  if (config.detail >= 2 && o.shows(0.9, 6)) for (let y = TOWER_COURSE_M; y < h - 2.4; y += TOWER_COURSE_M) out.push(...blindWindow(w / 2, y, 0.9, 1.4, true, o, config.detail >= 3));
  return out;
}

function pier(s: Surface, ctx: PatioContext): Shape[] {
  const { width: w, height: h } = s.frame;
  const { pal, config } = ctx;
  if (!enabled(config, "chevrón") || w > 2.5) return [];
  const o = ornamentOn(s, ctx, inks(pal.ink, pal.primary, pal.bg, pal.accent));
  if (!o.shows(w, 5)) return [];
  const rowH = Math.max(0.3, w * (0.9 - 0.4 * config.density));
  const rows = Math.floor(h / rowH);
  const out: Shape[] = [];
  for (let k = 0; k < rows; k++) out.push(...band("chevrón", 0, h - (k + 1) * rowH, w, rowH, 1, o, config.detail >= 3));
  return out;
}

function arcadeLintel(s: Surface, ctx: PatioContext): Shape[] {
  const { width: w, height: h } = s.frame;
  const { pal, config } = ctx;
  const o = ornamentOn(s, ctx, inks(pal.ink, pal.accent, pal.bg, pal.secondary));
  if (config.detail < 2 || !o.shows(h - 0.2, 4)) return [];
  return band(bandLanguage(config, "greca"), 0, 0.1, w, h - 0.2, cellsFor(config, w), o);
}

function towerRoof(s: Surface, ctx: PatioContext): Shape[] {
  const { width: w, height: h } = s.frame;
  const { pal, config } = ctx;
  if (!enabled(config, "sierpinski")) return [];
  const o = ornamentOn(s, ctx, inks(pal.ink, pal.accent, pal.bg, pal.gold));
  const lift = 0.25;
  const r = Math.min(((w / 2) * (1 - lift / h)) / (Math.sqrt(3) / 2), (h - lift) / 1.5) * 0.85;
  if (!o.shows(r, 6)) return [];
  return sierpinski(w / 2, h - lift - r / 2, r, config.detail, pal.accent, o);
}

export function ornamentFor(s: Surface, ctx: PatioContext, frieze = false): Shape[] {
  switch (s.role) {
    case "muro-exterior": return exteriorWall(s, ctx, frieze);
    case "torre": return towerWall(s, ctx);
    case "pilar": return pier(s, ctx);
    case "dintel-arcada": return arcadeLintel(s, ctx);
    case "cubierta-torre": return towerRoof(s, ctx);
  }
}

export type FriezeOf = (s: Surface) => Decor;

export function decorSurface(ctx: PatioContext, s: Surface, frieze?: FriezeOf): Decor {
  const t4 = frieze ? frieze(s) : { shapes: [], records: [] };
  const local = ornamentFor(s, ctx, t4.shapes.length > 0);
  return { shapes: [...mapShapes(local, s.frame, ctx.projector), ...t4.shapes], records: t4.records };
}

export function ornamento(ctx: PatioContext, surfaces: Surface[], frieze?: FriezeOf): Stage {
  const shapes: Shape[] = [];
  const records: RewriteRecord[] = [];
  const count: Record<string, number> = {};
  for (const s of surfaces) {
    const d = decorSurface(ctx, s, frieze);
    if (d.shapes.length === 0) continue;
    count[s.role] = (count[s.role] ?? 0) + 1;
    shapes.push(...d.shapes);
    records.push(...d.records);
  }
  return {
    name: "ornamento",
    shapes,
    provenance: {
      algorithm: "ornamento por superficie y función: marco local (origen abajo-izquierda, u arista, v vertical), motivo 2D en metros, mapeo punto a punto a 3D y proyección",
      params: { detalle: ctx.config.detail, densidad: ctx.config.density, lenguajes: ctx.config.ornament.join(","), ...count, frisos_habitados: records.length },
      decision: "muro exterior → banda bajo cornisa + ventanas ciegas, una fila por cada piso de 3 m; torre → estrías + roseta alta + una aspillera por cada 4 m de altura; arcada → chevrón apilado en pilares y banda en dinteles; cubierta de torre → sierpinski; losas lisas. Tres niveles: bandas / subdivisiones / puntos y rosetas" + (records.length ? `; T4: en ${records.length} muros altos la banda se vuelve friso de celdas habitadas` : ""),
      ...(records.length ? { rewrites: records } : {}),
    },
  };
}
