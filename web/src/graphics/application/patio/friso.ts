import { REWRITES, REWRITE_TUNING } from "../../config/rewrites.ts";
import { inhabitedFrieze } from "../../domain/rewrite/frieze.ts";
import { applyRewrite, type Ink, type RewriteRecord, type Rule } from "../../domain/rewrite/rewrite.ts";
import type { MotifDef } from "../../domain/motifs/figures/types.ts";
import type { Shape } from "../../domain/shapes.ts";
import { fnv1a, mulberry32 } from "../../../shared/rng.ts";
import { partOnFace } from "./facePart.ts";
import type { Surface } from "./surfaces.ts";
import type { PatioContext } from "./types.ts";

export type Decor = { shapes: Shape[]; records: RewriteRecord[] };

const TOP = 0.2;
const MIN_WALL_H = 4;
const MIN_WALL_W = 3;

export function hasFrieze(s: Surface): boolean {
  return s.role === "muro-exterior" && s.frame.height >= MIN_WALL_H && s.frame.width >= MIN_WALL_W;
}

/** T4 on a tall exterior wall: the band under the cornice becomes a frieze of cells, one in every few inhabited. */
export function friso(ctx: PatioContext, s: Surface, ink: Ink, motifs: readonly MotifDef[], seed: number, reason: string): Decor {
  if (!hasFrieze(s)) return { shapes: [], records: [] };
  const h = REWRITE_TUNING.friezeHeightM;
  const id = `${s.face.solid.id}.friso`;
  const band = partOnFace(s.frame, ctx.projector, { x0: 0, y0: TOP, x1: s.frame.width, y1: TOP + h }, id, "connector", "friso");
  const rule: Rule = { rewrite: REWRITES.T4_INHABITED_FRIEZE, produce: inhabitedFrieze({ period: REWRITE_TUNING.friezePeriod, motifs }) };
  const out = applyRewrite(rule, band, { depth: 0, seed, reason, rng: mulberry32(seed ^ fnv1a(id)), ink });
  return "part" in out ? { shapes: out.shapes, records: out.records } : { shapes: [], records: [] };
}
