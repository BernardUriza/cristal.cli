import { polygonBounds } from "../../domain/bezier.ts";
import { boundsOf, boxCenter, type Vec3 } from "../../domain/math/vec3.ts";
import { polygon, type Shape, type Vec2 } from "../../domain/shapes.ts";
import { projectPolygon, type TaggedFace } from "../drawings/faces.ts";
import type { Columns } from "./columnas.ts";
import type { SceneItem } from "./escena.ts";
import type { PatioContext } from "./types.ts";

function meanDepth(points: readonly Vec3[], ctx: PatioContext): number {
  let z = 0;
  for (const p of points) z += ctx.projector.toNdc(p)[2];
  return z / Math.max(1, points.length);
}

function paint(faces: TaggedFace[], ctx: PatioContext): Shape[] {
  return faces
    .map((f) => ({ f, d: meanDepth(f.points, ctx) }))
    .sort((a, b) => b.d - a.d)
    .map(({ f }) => polygon(projectPolygon(f.points, ctx.projector), { fill: ctx.style.fills[f.solid.tag.kind], stroke: ctx.style.ink, strokeWidth: ctx.style.edgeWidth, join: "round" }));
}

/** One scene item per solid above the ground: its camera-facing faces, or for a pier rewritten by T1 its block above the capital plus the figure. */
export function solidItems(ctx: PatioContext, faces: TaggedFace[], columns: Columns): SceneItem[] {
  const bySolid = new Map<string, TaggedFace[]>();
  for (const f of faces) {
    if (f.solid.tag.kind === "floor") continue;
    const list = bySolid.get(f.solid.id) ?? [];
    list.push(f);
    bySolid.set(f.solid.id, list);
  }
  const items: SceneItem[] = [];
  for (const [id, own] of bySolid) {
    const solid = own[0].solid;
    const box = boundsOf(solid.faces.flatMap((f) => f.points));
    const screen = polygonBounds(own.flatMap((f): Vec2[] => projectPolygon(f.points, ctx.projector)));
    const column = columns.bySolid.get(id);
    const shapes = column ? [...paint(column.faces, ctx), ...column.figure] : paint(own, ctx);
    items.push({ id, kind: "solid", box, screen, depth: ctx.projector.toNdc(boxCenter(box))[2], shapes });
  }
  return items;
}
