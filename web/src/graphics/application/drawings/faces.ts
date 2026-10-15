import type { Building, Face, Solid } from "../../domain/architecture/mass.ts";
import { openingRect } from "../../domain/architecture/mass.ts";
import { clipPolygon, sectionOfConvex, type Plane, type Side } from "../../domain/math/clip.ts";
import { centroid, dot, sub, type Vec3 } from "../../domain/math/vec3.ts";
import { polygon, rect, type Shape, type Vec2 } from "../../domain/shapes.ts";
import type { DrawingStyle } from "../../config/drawings.ts";
import type { Projector } from "../projector.ts";

export type TaggedFace = Face & { solid: Solid };

export function projectPolygon(points: readonly Vec3[], projector: Projector): Vec2[] {
  return points.map((p) => projector.toScreen(p));
}

export function facesTowardCamera(faces: TaggedFace[], projector: Projector): TaggedFace[] {
  return faces.filter((f) => {
    const toward = projector.kind === "perspective" ? sub(centroid(f.points), projector.eye) : projector.forward;
    return dot(f.normal, toward) < -1e-9;
  });
}

export function facesOf(building: Building): TaggedFace[] {
  return building.solids.flatMap((solid) => solid.faces.map((f) => ({ ...f, solid })));
}

export function keptFaces(faces: TaggedFace[], plane: Plane, keep: Side): TaggedFace[] {
  const out: TaggedFace[] = [];
  for (const f of faces) {
    const clipped = clipPolygon(f.points, plane, keep);
    if (clipped.length >= 3) out.push({ ...f, points: clipped });
  }
  return out;
}

export function cutPolygons(building: Building, plane: Plane): { solid: Solid; points: Vec3[] }[] {
  const out: { solid: Solid; points: Vec3[] }[] = [];
  for (const solid of building.solids) {
    const cut = sectionOfConvex(solid.faces.map((f) => f.points), plane);
    if (cut.length >= 3) out.push({ solid, points: cut });
  }
  return out;
}

function meanDepth(points: readonly Vec3[], projector: Projector): number {
  let z = 0;
  for (const p of points) z += projector.toNdc(p)[2];
  return z / points.length;
}

/** Painter's algorithm by solid (farthest solid first, then farthest face). Exact for separated convex solids; not a hidden-line pass. */
export function paintFaces(faces: TaggedFace[], projector: Projector, style: DrawingStyle): Shape[] {
  const solidDepth = new Map<string, number>();
  for (const f of faces) {
    if (!solidDepth.has(f.solid.id)) solidDepth.set(f.solid.id, meanDepth(f.solid.faces.flatMap((x) => x.points), projector));
  }
  return faces
    .map((f) => ({ f, solid: solidDepth.get(f.solid.id)!, depth: meanDepth(f.points, projector) }))
    .sort((a, b) => b.solid - a.solid || b.depth - a.depth)
    .map(({ f }) => polygon(projectPolygon(f.points, projector), { fill: style.fills[f.solid.tag.kind], stroke: style.ink, strokeWidth: style.edgeWidth, join: "round" }));
}

export function paintCuts(cuts: { points: Vec3[] }[], projector: Projector, style: DrawingStyle): Shape[] {
  return cuts.map((c) => polygon(projectPolygon(c.points, projector), { fill: style.poche, stroke: style.ink, strokeWidth: style.cutWidth, join: "miter" }));
}

export function paper(projector: Projector, style: DrawingStyle): Shape {
  return rect(0, 0, projector.viewport.width, projector.viewport.height, { fill: style.paper });
}

export function openingFeatures(building: Building, projector: Projector): Record<string, Vec2[]> {
  const out: Record<string, Vec2[]> = {};
  for (const o of building.plan.openings) out[o.id] = projectPolygon(openingRect(building.plan, o), projector);
  return out;
}
