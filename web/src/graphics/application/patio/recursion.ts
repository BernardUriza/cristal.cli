import { ARCH_REWRITE_TUNING as K, ARCH_RULE_ID, REWRITES, type ArchRule } from "../../config/rewrites.ts";
import { mapShapePoints } from "../../domain/mapPoints.ts";
import { quad } from "../../domain/motifs/figures/parts.ts";
import { facadeHost } from "../../domain/rewrite/host.ts";
import { miniBuilding } from "../../domain/rewrite/miniBuilding.ts";
import { miniTemple } from "../../domain/rewrite/miniTemple.ts";
import { portalScene } from "../../domain/rewrite/portalScene.ts";
import { frameToScreen, mapPart, paintChildren, type Ink, type Rule } from "../../domain/rewrite/rewrite.ts";
import type { Vec2 } from "../../domain/shapes.ts";
import { clamp } from "../../../shared/math.ts";
import { chance, fnv1a, mulberry32 } from "../../../shared/rng.ts";
import { partOnFace } from "./facePart.ts";
import type { Decor } from "./friso.ts";
import type { Surface, SurfaceRole } from "./surfaces.ts";
import type { PatioContext } from "./types.ts";

export const REASON_RECURSION = "La narración pidió arquitectura recursiva: ornamento que es edificio, piezas que son templos, celdas que son espacios";

export type Recursion = { rules: Rule[]; hosts: Set<string>; rate: number; seed: number; ink: Ink; viewport: Vec2[] };

const HOSTS: readonly SurfaceRole[] = ["muro-exterior", "torre"];

const keyOf = (s: Surface) => `${s.face.solid.id}@${s.face.normal.map((v) => v.toFixed(2)).join(",")}`;

export function archRules(ids: readonly ArchRule[]): Rule[] {
  const produce = { T5: miniBuilding(), T6: miniTemple(K.templeRise), T7: portalScene() };
  return ids.map((id) => ({ rewrite: REWRITES[ARCH_RULE_ID[id]], produce: produce[id] }));
}

/** How many walls and panels turn recursive: the recipe's ornament density and anomaly rate, never zero once declared. */
export function rewriteRate(density: number, anomalyRate: number): number {
  return clamp(K.base + K.density * density + K.anomaly * anomalyRate, 0, 1);
}

const isHost = (s: Surface) => HOSTS.includes(s.role) && Math.min(s.px.w, s.px.h) >= K.hostMinPx;

/** The walls that hold a chain: the one with the widest short side always, the others by the rate, seeded by the work. */
export function recursion(ctx: PatioContext, surfaces: readonly Surface[], ink: Ink, seed: number): Recursion | undefined {
  if (!ctx.config.rewrites.length) return undefined;
  const rate = rewriteRate(ctx.config.density, ctx.config.anomalyRate);
  const rng = mulberry32(seed ^ fnv1a("recursion"));
  const ranked = surfaces.filter(isHost).sort((a, b) => Math.min(b.px.w, b.px.h) - Math.min(a.px.w, a.px.h));
  const hosts = new Set(ranked.filter((_, i) => i === 0 || chance(rng, rate)).map(keyOf));
  return { rules: archRules(ctx.config.rewrites), hosts, rate, seed, ink, viewport: quad(0, 0, ctx.config.width, ctx.config.height) };
}

/** A host wall replaces its ornament with a crown band and panels; the picked ones are rewritten, the rest drawn as plain ornament. */
export function recursiveDecor(ctx: PatioContext, s: Surface, r: Recursion): Decor | undefined {
  const key = keyOf(s);
  if (!r.hosts.has(key)) return undefined;
  const rng = mulberry32(r.seed ^ fnv1a(key));
  const { width: w, height: h } = s.frame;
  const host = facadeHost(w, h, { crown: s.role === "torre" ? "capitel" : "fronton", crownShare: K.frontonShare, panelAspect: K.panelAspect, pick: (slot) => slot === 1 || chance(rng, r.rate) }, r.ink);
  const base = partOnFace(s.frame, ctx.projector, { x0: 0, y0: 0, x1: w, y1: h }, `${s.face.solid.id}.fachada`, "enclosure", "fachada");
  const at = frameToScreen(base.frame!);
  const part = mapPart(host.part, at, base.id);
  const own = host.childShapes!.map((c) => mapShapePoints(c, at));
  const env = { depth: 0, seed: r.seed, reason: REASON_RECURSION, rng, ink: r.ink, region: `${s.role} ${s.face.solid.id}`, clip: r.viewport };
  return paintChildren(part.children, own, r.rules, env);
}
