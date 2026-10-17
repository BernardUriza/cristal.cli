import { REWRITES } from "../../config/rewrites.ts";
import { clipPolygon, planeY } from "../../domain/math/clip.ts";
import type { MotifDef } from "../../domain/motifs/figures/types.ts";
import { caryatid } from "../../domain/rewrite/caryatid.ts";
import { applyRewrite, type Ink, type RewriteRecord } from "../../domain/rewrite/rewrite.ts";
import type { Shape } from "../../domain/shapes.ts";
import { mulberry32 } from "../../../shared/rng.ts";
import type { TaggedFace } from "../drawings/faces.ts";
import { frameOf, toWorld } from "./frame.ts";
import { add, centroid, scale } from "../../domain/math/vec3.ts";
import { partOnFace } from "./facePart.ts";
import type { PatioContext } from "./types.ts";

export type Column = { faces: TaggedFace[]; figure: Shape[] };

export type Columns = { bySolid: Map<string, Column>; records: RewriteRecord[] };

const MIN_PIER_H = 2;
const MAX_PIER_W = 2.5;

function courtyardFacing(ctx: PatioContext, f: TaggedFace): boolean {
  const court = ctx.building.plan.spaces.find((sp) => sp.kind === "courtyard");
  const wall = ctx.building.plan.walls.find((w) => w.id === f.solid.tag.wall);
  if (!court || !wall || f.solid.tag.kind !== "wall" || Math.abs(f.normal[1]) > 0.1) return false;
  const p = add(centroid(f.points), scale(f.normal, wall.thickness / 2 + 0.3));
  return p[0] > court.rect.x0 && p[0] < court.rect.x1 && p[2] > court.rect.z0 && p[2] < court.rect.z1;
}

function capitalOf(ctx: PatioContext, wall: string | undefined, fallback: number): number {
  const lintels = ctx.building.solids.filter((s) => s.tag.kind === "lintel" && s.tag.wall === wall);
  const ys = lintels.flatMap((s) => s.faces.flatMap((f) => f.points.map((p) => p[1])));
  return ys.length ? Math.min(...ys) : fallback;
}

/** T1 on every visible arcade pier: below the capital the pier IS the figure; above it the pier block stays, clipped at the capital plane. */
export function columnas(ctx: PatioContext, faces: TaggedFace[], ink: Ink, head: MotifDef | undefined, seed: number, reason: string): Columns {
  const bySolid = new Map<string, Column>();
  const records: RewriteRecord[] = [];
  const rng = mulberry32(seed ^ 0x51ed27);
  const rule = { rewrite: REWRITES.T1_COLUMN_AS_BODY, produce: caryatid(head) };
  for (const face of faces) {
    const id = face.solid.id;
    if (bySolid.has(id) || !courtyardFacing(ctx, face)) continue;
    const frame = frameOf(face.points, face.normal, ctx.projector);
    if (frame.height < MIN_PIER_H || frame.width > MAX_PIER_W) continue;
    const base = frame.origin[1];
    const capital = Math.min(capitalOf(ctx, face.solid.tag.wall, base + frame.height * 0.8), base + frame.height);
    const yCap = frame.height - (capital - base);
    const w = frame.width;
    const pier = partOnFace(frame, ctx.projector, { x0: 0, y0: yCap, x1: w, y1: frame.height }, `${id}.pilar`, "support", "pilar", {
      base: ctx.projector.toScreen(toWorld(frame, w / 2, frame.height)),
      capital: ctx.projector.toScreen(toWorld(frame, w / 2, yCap)),
    });
    const out = applyRewrite(rule, pier, { depth: 0, seed, reason, rng, ink });
    if (!("part" in out)) continue;
    const upper = faces
      .filter((f) => f.solid.id === id)
      .map((f) => ({ ...f, points: clipPolygon(f.points, planeY(capital), "positive") }))
      .filter((f) => f.points.length >= 3);
    bySolid.set(id, { faces: upper, figure: out.shapes });
    records.push(...out.records);
  }
  return { bySolid, records };
}
