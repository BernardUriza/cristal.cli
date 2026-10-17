import type { Rng } from "../../../../shared/rng";
import { pointInPolygon, polygonBounds, polygonCentroid } from "../../bezier.ts";
import { circle, ellipse, group, line, path, polygon, type Shape, type Style, type Vec2 } from "../../shapes.ts";

export type Ornament = { shapes: Shape[]; params: Record<string, number | string> };

const GOLDEN_ANGLE = Math.PI * (3 - Math.sqrt(5));

export function insideRuns(poly: readonly Vec2[], a: Vec2, b: Vec2, step: number): [Vec2, Vec2][] {
  const len = Math.hypot(b[0] - a[0], b[1] - a[1]);
  const n = Math.max(1, Math.ceil(len / step));
  const runs: [Vec2, Vec2][] = [];
  let start: Vec2 | null = null;
  for (let k = 0; k <= n; k++) {
    const t = k / n;
    const p: Vec2 = [a[0] + (b[0] - a[0]) * t, a[1] + (b[1] - a[1]) * t];
    const inside = pointInPolygon(p, poly);
    if (inside && !start) start = p;
    if (!inside && start) {
      runs.push([start, p]);
      start = null;
    }
  }
  return runs;
}

export function hatch(poly: readonly Vec2[], spacing: number, angle: number, style: Style): Ornament {
  const b = polygonBounds(poly);
  const diag = Math.hypot(b.maxX - b.minX, b.maxY - b.minY);
  const cx = (b.minX + b.maxX) / 2, cy = (b.minY + b.maxY) / 2;
  const rad = (angle * Math.PI) / 180;
  const d: Vec2 = [Math.cos(rad), Math.sin(rad)];
  const nrm: Vec2 = [-d[1], d[0]];
  const shapes: Shape[] = [];
  for (let k = -diag / 2; k <= diag / 2; k += spacing) {
    const ox = cx + nrm[0] * k, oy = cy + nrm[1] * k;
    const a: Vec2 = [ox - (d[0] * diag) / 2, oy - (d[1] * diag) / 2];
    const bb: Vec2 = [ox + (d[0] * diag) / 2, oy + (d[1] * diag) / 2];
    for (const [p, q] of insideRuns(poly, a, bb, Math.max(1, spacing / 3))) shapes.push(line(p, q, style));
  }
  return { shapes, params: { hatchSpacing: spacing, hatchAngle: angle, hatchLines: shapes.length } };
}

export function phyllotaxis(poly: readonly Vec2[], count: number, spacing: number): Vec2[] {
  const c = polygonCentroid(poly);
  const b = polygonBounds(poly);
  const reach = Math.hypot(b.maxX - b.minX, b.maxY - b.minY);
  const out: Vec2[] = [];
  for (let i = 0; out.length < count; i++) {
    const r = spacing * Math.sqrt(i);
    if (r > reach) break;
    const a = i * GOLDEN_ANGLE;
    const p: Vec2 = [c[0] + r * Math.cos(a), c[1] + r * Math.sin(a)];
    if (pointInPolygon(p, poly)) out.push(p);
  }
  return out;
}

export function stipple(poly: readonly Vec2[], rng: Rng, density: number, r: number, fill: string): Ornament {
  const b = polygonBounds(poly);
  const spacing = Math.sqrt(((b.maxX - b.minX) * (b.maxY - b.minY)) / (Math.PI * Math.max(1, density)));
  const shapes: Shape[] = [];
  for (const p of phyllotaxis(poly, density, spacing)) {
    const j: Vec2 = [p[0] + (rng() - 0.5) * r, p[1] + (rng() - 0.5) * r];
    const q = pointInPolygon(j, poly) ? j : p;
    shapes.push(circle(q[0], q[1], r, { fill }));
  }
  return { shapes, params: { stippleDensity: density, stippleRadius: r, stippleSpacing: Number(spacing.toFixed(2)), dots: shapes.length } };
}

export function spots(poly: readonly Vec2[], rng: Rng, count: number, rMin: number, rMax: number, style: Style): Ornament {
  const b = polygonBounds(poly);
  const shapes: Shape[] = [];
  for (let tries = 0; shapes.length < count && tries < count * 40; tries++) {
    const p: Vec2 = [b.minX + rng() * (b.maxX - b.minX), b.minY + rng() * (b.maxY - b.minY)];
    if (!pointInPolygon(p, poly)) continue;
    const r = rMin + rng() * (rMax - rMin);
    const rot = Math.round(rng() * 180);
    shapes.push(group([{ translate: p }, { rotate: rot }], [ellipse(0, 0, r, r * 0.65, style)]));
  }
  return { shapes, params: { spotCount: shapes.length, spotRadiusMin: rMin, spotRadiusMax: rMax } };
}

export function scales(poly: readonly Vec2[], rowH: number, style: Style): Ornament {
  const b = polygonBounds(poly);
  const shapes: Shape[] = [];
  let rows = 0;
  for (let y = b.minY, j = 0; y <= b.maxY; y += rowH, j++) {
    const offset = (j % 2) * rowH;
    for (let x = b.minX - rowH * 2 + offset; x < b.maxX; x += rowH * 2) {
      const l: Vec2 = [x, y], r: Vec2 = [x + rowH * 2, y], bottom: Vec2 = [x + rowH, y + rowH];
      if (!pointInPolygon(l, poly) || !pointInPolygon(r, poly) || !pointInPolygon(bottom, poly)) continue;
      shapes.push(path([{ op: "M", p: l }, { op: "A", r: rowH, large: 0, sweep: 0, p: r }], style));
    }
    rows++;
  }
  return { shapes, params: { scaleRowHeight: Number(rowH.toFixed(2)), scaleRows: rows, scaleCount: shapes.length } };
}

export function contourLines(poly: readonly Vec2[], count: number, style: Style, inset = 0.08): Ornament {
  const c = polygonCentroid(poly);
  const shapes: Shape[] = [];
  for (let i = 1; i <= count; i++) {
    const f = 1 - i * inset;
    shapes.push(polygon(poly.map((p): Vec2 => [c[0] + (p[0] - c[0]) * f, c[1] + (p[1] - c[1]) * f]), style));
  }
  return { shapes, params: { contourCount: count, contourInset: inset } };
}
