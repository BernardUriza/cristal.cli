import type { Wall } from "../../domain/architecture/plan.ts";
import { add, centroid, dot, scale, type Vec3 } from "../../domain/math/vec3.ts";
import { facesOf, facesTowardCamera, type TaggedFace } from "../drawings/faces.ts";
import { spaceAt } from "./building.ts";
import { frameOf, projectedSize, type LocalFrame } from "./frame.ts";
import type { PatioContext } from "./types.ts";

export type SurfaceRole = "muro-exterior" | "torre" | "pilar" | "dintel-arcada" | "cubierta-torre";

export type Surface = { face: TaggedFace; role: SurfaceRole; frame: LocalFrame; px: { w: number; h: number }; space?: string };

type Classified = { role: SurfaceRole; space?: string; base: number };

const MIN_WALL_WIDTH = 1;

function isEndCap(face: TaggedFace, wall: Wall): boolean {
  const L = Math.hypot(wall.b[0] - wall.a[0], wall.b[1] - wall.a[1]) || 1;
  const along: Vec3 = [(wall.b[0] - wall.a[0]) / L, 0, (wall.b[1] - wall.a[1]) / L];
  return Math.abs(dot(face.normal, along)) > 0.1;
}

/** A wall face is read by what it looks at: the exterior, the courtyard, or a lower neighbour whose roof leaves the upper part outside. */
function roleOf(face: TaggedFace, ctx: PatioContext): Classified | undefined {
  const { tag } = face.solid;
  if (tag.kind === "tower-roof") return { role: "cubierta-torre", space: tag.space, base: 0 };
  if (!tag.wall || tag.kind === "sill") return undefined;
  const wall = ctx.building.plan.walls.find((w) => w.id === tag.wall);
  if (!wall || isEndCap(face, wall)) return undefined;
  const probe = add(centroid(face.points), scale(face.normal, wall.thickness / 2 + 0.3));
  const facing = spaceAt(ctx.building, probe[0], probe[2]);
  const ownId = facing?.id === wall.left ? wall.right : wall.left;
  const own = ctx.building.plan.spaces.find((s) => s.id === ownId);
  if (tag.kind === "wall" && (!facing || facing.kind === "exterior")) return own?.kind === "tower" ? { role: "torre", space: own.id, base: 0 } : { role: "muro-exterior", space: own?.id, base: 0 };
  if (!facing) return undefined;
  if (facing.kind === "courtyard") return tag.kind === "wall" ? { role: "pilar", space: ownId, base: 0 } : { role: "dintel-arcada", space: ownId, base: 0 };
  if (own && own.height > facing.height + 0.5) {
    const base = facing.height + ctx.building.plan.layout.heights.roofSlab;
    return own.kind === "tower" ? { role: "torre", space: own.id, base } : { role: "muro-exterior", space: own.id, base };
  }
  return undefined;
}

export function visibleFaces(ctx: PatioContext): TaggedFace[] {
  return facesTowardCamera(facesOf(ctx.building), ctx.projector);
}

export function surfacesOf(ctx: PatioContext): Surface[] {
  const out: Surface[] = [];
  for (const face of visibleFaces(ctx)) {
    const c = roleOf(face, ctx);
    if (!c) continue;
    const points = c.base > 0 ? face.points.map((p): Vec3 => [p[0], Math.max(p[1], c.base), p[2]]) : face.points;
    const frame = frameOf(points, face.normal, ctx.projector);
    if (c.role !== "cubierta-torre" && frame.width < MIN_WALL_WIDTH) continue;
    out.push({ face: { ...face, points }, role: c.role, space: c.space, frame, px: projectedSize(frame, ctx.projector) });
  }
  return out;
}
