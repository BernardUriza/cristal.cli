import type { DisplayList, Vec2 } from "../../domain/shapes.ts";
import type { ComplexityTuning } from "../../config/complexity.ts";
import { flattenLeaves, polygonArea } from "./leaves.ts";

function centroid(points: readonly Vec2[]): Vec2 {
  let sx = 0, sy = 0;
  for (const [x, y] of points) { sx += x; sy += y; }
  return [sx / points.length, sy / points.length];
}

function rayReach(points: readonly Vec2[], c: Vec2, angle: number): number {
  const dx = Math.cos(angle), dy = Math.sin(angle);
  let best = 0;
  for (let i = 0; i < points.length; i++) {
    const [ax, ay] = points[i];
    const [bx, by] = points[(i + 1) % points.length];
    const ex = bx - ax, ey = by - ay;
    const den = dx * ey - dy * ex;
    if (Math.abs(den) < 1e-12) continue;
    const qx = ax - c[0], qy = ay - c[1];
    const t = (qx * ey - qy * ex) / den;
    const u = (qx * dy - qy * dx) / den;
    if (t > 0 && u >= 0 && u <= 1) best = Math.max(best, t);
  }
  return best;
}

export function silhouetteDescriptor(points: readonly Vec2[], rays: number): number[] {
  const c = centroid(points);
  const radii = Array.from({ length: rays }, (_, i) => rayReach(points, c, (i / rays) * Math.PI * 2));
  const max = Math.max(...radii);
  return max > 0 ? radii.map((r) => r / max) : radii;
}

export function silhouetteDistance(a: readonly number[], b: readonly number[]): number {
  let best = Infinity;
  for (let shift = 0; shift < a.length; shift++) {
    let sum = 0;
    for (let i = 0; i < a.length; i++) sum += Math.abs(a[i] - b[(i + shift) % b.length]);
    best = Math.min(best, sum / a.length);
  }
  return best;
}

export function silhouetteFamilies(descriptors: readonly number[][], threshold: number): number[][] {
  const families: number[][] = [];
  for (const d of descriptors) if (!families.some((f) => silhouetteDistance(f, d) < threshold)) families.push(d);
  return families;
}

function cross(o: Vec2, a: Vec2, b: Vec2): number {
  return (a[0] - o[0]) * (b[1] - o[1]) - (a[1] - o[1]) * (b[0] - o[0]);
}

export function convexHull(points: readonly Vec2[]): Vec2[] {
  const sorted = [...points].sort((a, b) => a[0] - b[0] || a[1] - b[1]);
  const half = (pts: Vec2[]) => pts.reduce<Vec2[]>((h, p) => {
    while (h.length >= 2 && cross(h[h.length - 2], h[h.length - 1], p) <= 0) h.pop();
    h.push(p);
    return h;
  }, []);
  const lower = half(sorted);
  const upper = half([...sorted].reverse());
  return [...lower.slice(0, -1), ...upper.slice(0, -1)];
}

function outlines(list: DisplayList, segments: number): Vec2[][] {
  return list.flatMap((shape) => {
    const leaves = flattenLeaves([shape], segments);
    if (shape.kind === "group") return leaves.length ? [convexHull(leaves.flatMap((l) => l.points))] : [];
    return leaves.filter((l) => l.closed).map((l) => l.points);
  });
}

export function silhouetteDiversity(list: DisplayList, canvasArea: number, tuning: ComplexityTuning): { candidates: number; families: number } {
  const isCandidate = (pts: Vec2[]) => pts.length >= 3 && polygonArea(pts) >= tuning.silhouetteMinAreaPx && polygonArea(pts) <= canvasArea * tuning.backgroundAreaRatio;
  const shapes = outlines(list, tuning.circleSegments).filter(isCandidate);
  const descriptors = shapes.map((points) => silhouetteDescriptor(points, tuning.silhouetteRays));
  return { candidates: shapes.length, families: silhouetteFamilies(descriptors, tuning.silhouetteThreshold).length };
}
