import type { Vec2 } from "./shapes.ts";

export type CubicSegment = readonly [Vec2, Vec2, Vec2, Vec2];
export type Anchor = { p: Vec2; sharp?: boolean };
export type Placement = { cx: number; cy: number; size: number; rotate?: number; mirror?: boolean };
export type Bounds = { minX: number; minY: number; maxX: number; maxY: number };

export function cubicPoint(p0: Vec2, p1: Vec2, p2: Vec2, p3: Vec2, t: number): Vec2 {
  const u = 1 - t;
  const a = u * u * u;
  const b = 3 * u * u * t;
  const c = 3 * u * t * t;
  const d = t * t * t;
  return [a * p0[0] + b * p1[0] + c * p2[0] + d * p3[0], a * p0[1] + b * p1[1] + c * p2[1] + d * p3[1]];
}

export function catmullRomCubics(anchors: readonly Anchor[], tension = 0.5): CubicSegment[] {
  const n = anchors.length;
  const at = (i: number) => anchors[((i % n) + n) % n];
  const out: CubicSegment[] = [];
  for (let i = 0; i < n; i++) {
    const prev = at(i - 1).p;
    const a = at(i);
    const b = at(i + 1);
    const next = at(i + 2).p;
    const k = tension / 3;
    const c1: Vec2 = a.sharp ? a.p : [a.p[0] + (b.p[0] - prev[0]) * k, a.p[1] + (b.p[1] - prev[1]) * k];
    const c2: Vec2 = b.sharp ? b.p : [b.p[0] - (next[0] - a.p[0]) * k, b.p[1] - (next[1] - a.p[1]) * k];
    out.push([a.p, c1, c2, b.p]);
  }
  return out;
}

export function flattenCubics(segments: readonly CubicSegment[], stepsPerSegment: number): Vec2[] {
  const out: Vec2[] = [];
  for (const [p0, p1, p2, p3] of segments) {
    for (let k = 0; k < stepsPerSegment; k++) out.push(cubicPoint(p0, p1, p2, p3, k / stepsPerSegment));
  }
  return out;
}

export function pointInPolygon(p: Vec2, poly: readonly Vec2[]): boolean {
  let inside = false;
  for (let i = 0, j = poly.length - 1; i < poly.length; j = i++) {
    const [xi, yi] = poly[i];
    const [xj, yj] = poly[j];
    const crosses = yi > p[1] !== yj > p[1] && p[0] < ((xj - xi) * (p[1] - yi)) / (yj - yi) + xi;
    if (crosses) inside = !inside;
  }
  return inside;
}

export function polygonBounds(poly: readonly Vec2[]): Bounds {
  let minX = Infinity, minY = Infinity, maxX = -Infinity, maxY = -Infinity;
  for (const [x, y] of poly) {
    if (x < minX) minX = x;
    if (x > maxX) maxX = x;
    if (y < minY) minY = y;
    if (y > maxY) maxY = y;
  }
  return { minX, minY, maxX, maxY };
}

export function polygonCentroid(poly: readonly Vec2[]): Vec2 {
  let area = 0, cx = 0, cy = 0;
  for (let i = 0, j = poly.length - 1; i < poly.length; j = i++) {
    const cross = poly[j][0] * poly[i][1] - poly[i][0] * poly[j][1];
    area += cross;
    cx += (poly[j][0] + poly[i][0]) * cross;
    cy += (poly[j][1] + poly[i][1]) * cross;
  }
  if (Math.abs(area) < 1e-12) return poly[0];
  return [cx / (3 * area), cy / (3 * area)];
}

export function transformPoint(p: Vec2, place: Placement): Vec2 {
  const x = place.mirror ? -p[0] : p[0];
  const y = p[1];
  const a = ((place.rotate ?? 0) * Math.PI) / 180;
  const cos = Math.cos(a), sin = Math.sin(a);
  return [place.cx + (x * cos - y * sin) * place.size, place.cy + (x * sin + y * cos) * place.size];
}

export function transformPoints(points: readonly Vec2[], place: Placement): Vec2[] {
  return points.map((p) => transformPoint(p, place));
}

export function mirrorAnchors(rightHalf: readonly Anchor[]): Anchor[] {
  const left = rightHalf
    .filter((a) => Math.abs(a.p[0]) > 1e-9)
    .map((a): Anchor => ({ p: [-a.p[0], a.p[1]], sharp: a.sharp }))
    .reverse();
  return [...rightHalf, ...left];
}
