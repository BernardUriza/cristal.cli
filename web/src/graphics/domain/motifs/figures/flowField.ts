import { clamp } from "../../../../shared/math.ts";
import type { Rng } from "../../../../shared/rng";
import { pointInPolygon, polygonBounds } from "../../bezier.ts";
import { polyline, type Shape, type Style, type Vec2 } from "../../shapes.ts";
import type { Ornament } from "./ornamentador.ts";

export type FlowPolicy = { noiseCells: number; turns: number; baseAngle: number; steps: number; jitter: number };

export type FlowFill = { spacing: number; stepLen: number; style: Style; avoid?: (p: Vec2) => boolean };

const smooth = (t: number) => t * t * (3 - 2 * t);

export function valueNoise(rng: Rng, cells: number): (u: number, v: number) => number {
  const n = cells + 1;
  const lattice = Array.from({ length: n * n }, () => rng());
  const at = (i: number, j: number) => lattice[j * n + i];
  return (u, v) => {
    const x = clamp(u, 0, 1) * cells, y = clamp(v, 0, 1) * cells;
    const i = Math.min(cells - 1, Math.floor(x)), j = Math.min(cells - 1, Math.floor(y));
    const sx = smooth(x - i), sy = smooth(y - j);
    const top = at(i, j) + (at(i + 1, j) - at(i, j)) * sx;
    const bottom = at(i, j + 1) + (at(i + 1, j + 1) - at(i, j + 1)) * sx;
    return top + (bottom - top) * sy;
  };
}

export function angleField(poly: readonly Vec2[], rng: Rng, policy: FlowPolicy): (p: Vec2) => number {
  const b = polygonBounds(poly);
  const w = Math.max(1e-9, b.maxX - b.minX), h = Math.max(1e-9, b.maxY - b.minY);
  const noise = valueNoise(rng, policy.noiseCells);
  const base = (policy.baseAngle * Math.PI) / 180;
  return (p) => base + noise((p[0] - b.minX) / w, (p[1] - b.minY) / h) * policy.turns * 2 * Math.PI;
}

export function traceStream(start: Vec2, poly: readonly Vec2[], angle: (p: Vec2) => number, stepLen: number, steps: number, avoid?: (p: Vec2) => boolean): Vec2[] {
  const pts: Vec2[] = [start];
  let p = start;
  for (let k = 0; k < steps; k++) {
    const a = angle(p);
    const q: Vec2 = [p[0] + Math.cos(a) * stepLen, p[1] + Math.sin(a) * stepLen];
    if (!pointInPolygon(q, poly) || avoid?.(q)) break;
    pts.push(q);
    p = q;
  }
  return pts;
}

export function flowField(poly: readonly Vec2[], rng: Rng, fill: FlowFill, policy: FlowPolicy): Ornament {
  const angle = angleField(poly, rng, policy);
  const b = polygonBounds(poly);
  const shapes: Shape[] = [];
  for (let y = b.minY + fill.spacing / 2; y < b.maxY; y += fill.spacing) {
    for (let x = b.minX + fill.spacing / 2; x < b.maxX; x += fill.spacing) {
      const start: Vec2 = [x + (rng() - 0.5) * fill.spacing * policy.jitter, y + (rng() - 0.5) * fill.spacing * policy.jitter];
      if (!pointInPolygon(start, poly) || fill.avoid?.(start)) continue;
      const pts = traceStream(start, poly, angle, fill.stepLen, policy.steps, fill.avoid);
      if (pts.length >= 3) shapes.push(polyline(pts, fill.style));
    }
  }
  return {
    shapes,
    params: { flowLines: shapes.length, flowSpacing: Number(fill.spacing.toFixed(2)), flowSteps: policy.steps, flowNoiseCells: policy.noiseCells, flowTurns: policy.turns },
  };
}
