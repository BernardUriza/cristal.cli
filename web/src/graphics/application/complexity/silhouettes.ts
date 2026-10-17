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

type Box = { x0: number; y0: number; x1: number; y1: number };

function boxOf(points: readonly Vec2[]): Box {
  let x0 = Infinity, y0 = Infinity, x1 = -Infinity, y1 = -Infinity;
  for (const [x, y] of points) { x0 = Math.min(x0, x); y0 = Math.min(y0, y); x1 = Math.max(x1, x); y1 = Math.max(y1, y); }
  return { x0, y0, x1, y1 };
}

const touches = (a: Box, b: Box) => a.x0 <= b.x1 && b.x0 <= a.x1 && a.y0 <= b.y1 && b.y0 <= a.y1;

/** Pieces that touch form one mass (a building's faces, a creature's parts); each mass contributes one silhouette. */
function outlines(list: DisplayList, segments: number, maxArea: number): Vec2[][] {
  const pieces = flattenLeaves(list, segments).filter((l) => l.closed && l.points.length >= 3 && polygonArea(l.points) <= maxArea);
  const boxes = pieces.map((l) => boxOf(l.points));
  const parent = pieces.map((_, i) => i);
  const find = (i: number): number => (parent[i] === i ? i : (parent[i] = find(parent[i])));
  for (let i = 0; i < pieces.length; i++) for (let j = i + 1; j < pieces.length; j++) if (touches(boxes[i], boxes[j])) parent[find(i)] = find(j);
  const masses = new Map<number, Vec2[]>();
  pieces.forEach((l, i) => { const r = find(i); masses.set(r, [...(masses.get(r) ?? []), ...l.points]); });
  return [...masses.values()].map(convexHull);
}

export function silhouetteDiversity(list: DisplayList, canvasArea: number, tuning: ComplexityTuning): { candidates: number; families: number } {
  const isCandidate = (pts: Vec2[]) => pts.length >= 3 && polygonArea(pts) >= tuning.silhouetteMinAreaPx && polygonArea(pts) <= canvasArea * tuning.backgroundAreaRatio;
  const shapes = outlines(list, tuning.circleSegments, canvasArea * tuning.backgroundAreaRatio).filter(isCandidate);
  const descriptors = shapes.map((points) => silhouetteDescriptor(points, tuning.silhouetteRays));
  return { candidates: shapes.length, families: silhouetteFamilies(descriptors, tuning.silhouetteThreshold).length };
}
