import { centroid, cross, dot, lerp, normalize, sub, type Vec3 } from "./vec3.ts";

/** Points p with dot(normal, p) = offset lie on the plane; the normal side is "positive". */
export type Plane = { normal: Vec3; offset: number };

export const planeX = (x: number): Plane => ({ normal: [1, 0, 0], offset: x });
export const planeY = (y: number): Plane => ({ normal: [0, 1, 0], offset: y });
export const planeZ = (z: number): Plane => ({ normal: [0, 0, 1], offset: z });

export function signedDistance(plane: Plane, p: Vec3): number {
  return dot(plane.normal, p) - plane.offset;
}

export type Side = "positive" | "negative";

const EPS = 1e-9;

/** Sutherland–Hodgman: the part of a convex or simple polygon on `keep` side of the plane. */
export function clipPolygon(points: readonly Vec3[], plane: Plane, keep: Side): Vec3[] {
  const sign = keep === "positive" ? 1 : -1;
  const inside = (p: Vec3) => sign * signedDistance(plane, p) >= -EPS;
  const out: Vec3[] = [];
  const n = points.length;
  for (let i = 0; i < n; i++) {
    const cur = points[i];
    const prev = points[(i + n - 1) % n];
    const curIn = inside(cur);
    const prevIn = inside(prev);
    if (curIn !== prevIn) {
      const dPrev = signedDistance(plane, prev);
      const dCur = signedDistance(plane, cur);
      out.push(lerp(prev, cur, dPrev / (dPrev - dCur)));
    }
    if (curIn) out.push(cur);
  }
  return out;
}

export function polygonNormal(points: readonly Vec3[]): Vec3 {
  let nx = 0;
  let ny = 0;
  let nz = 0;
  for (let i = 0; i < points.length; i++) {
    const a = points[i];
    const b = points[(i + 1) % points.length];
    nx += (a[1] - b[1]) * (a[2] + b[2]);
    ny += (a[2] - b[2]) * (a[0] + b[0]);
    nz += (a[0] - b[0]) * (a[1] + b[1]);
  }
  return normalize([nx, ny, nz]);
}

/** Section polygon of a CONVEX solid given as face polygons: edge/plane intersections ordered around their centroid. */
export function sectionOfConvex(faces: readonly (readonly Vec3[])[], plane: Plane): Vec3[] {
  const hits: Vec3[] = [];
  for (const face of faces) {
    for (let i = 0; i < face.length; i++) {
      const a = face[i];
      const b = face[(i + 1) % face.length];
      const da = signedDistance(plane, a);
      const db = signedDistance(plane, b);
      if ((da < -EPS && db > EPS) || (da > EPS && db < -EPS)) hits.push(lerp(a, b, da / (da - db)));
      else if (Math.abs(da) <= EPS) hits.push(a);
    }
  }
  if (hits.length < 3) return [];
  const unique: Vec3[] = [];
  for (const h of hits) if (!unique.some((u) => Math.abs(u[0] - h[0]) < 1e-7 && Math.abs(u[1] - h[1]) < 1e-7 && Math.abs(u[2] - h[2]) < 1e-7)) unique.push(h);
  if (unique.length < 3) return [];
  const c = centroid(unique);
  const u = normalize(sub(unique[0], c));
  const v = cross(plane.normal, u);
  return unique
    .map((p) => ({ p, angle: Math.atan2(dot(sub(p, c), v), dot(sub(p, c), u)) }))
    .sort((a, b) => a.angle - b.angle)
    .map((x) => x.p);
}
