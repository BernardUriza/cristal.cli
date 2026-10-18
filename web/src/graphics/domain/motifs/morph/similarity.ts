import type { Vec2 } from "../../shapes.ts";

export type Similarity = { s: Vec2; t: Vec2 };

export const IDENTITY: Similarity = { s: [1, 0], t: [0, 0] };

const mul = (a: Vec2, b: Vec2): Vec2 => [a[0] * b[0] - a[1] * b[1], a[0] * b[1] + a[1] * b[0]];

function div(a: Vec2, b: Vec2): Vec2 {
  const d = b[0] * b[0] + b[1] * b[1];
  return [(a[0] * b[0] + a[1] * b[1]) / d, (a[1] * b[0] - a[0] * b[1]) / d];
}

export function applySim(m: Similarity, p: Vec2): Vec2 {
  const q = mul(m.s, p);
  return [q[0] + m.t[0], q[1] + m.t[1]];
}

export function invertSim(m: Similarity): Similarity {
  const s = div([1, 0], m.s);
  const t = mul(s, m.t);
  return { s, t: [-t[0], -t[1]] };
}

export function simFromPair(p0: Vec2, p1: Vec2, q0: Vec2, q1: Vec2): Similarity {
  const dp: Vec2 = [p1[0] - p0[0], p1[1] - p0[1]];
  const dq: Vec2 = [q1[0] - q0[0], q1[1] - q0[1]];
  const s = Math.hypot(dp[0], dp[1]) < 1e-12 ? ([1, 0] as Vec2) : div(dq, dp);
  const r = mul(s, p0);
  return { s, t: [q0[0] - r[0], q0[1] - r[1]] };
}

export function mean(points: readonly Vec2[]): Vec2 {
  let x = 0, y = 0;
  for (const p of points) { x += p[0]; y += p[1]; }
  return [x / points.length, y / points.length];
}

/** Least-squares uniform scale + translation, no rotation: upright motifs stay upright. */
export function scaleFit(src: readonly Vec2[], dst: readonly Vec2[]): Similarity {
  const cs = mean(src), cd = mean(dst);
  let num = 0, den = 0;
  for (let i = 0; i < src.length; i++) {
    const a: Vec2 = [src[i][0] - cs[0], src[i][1] - cs[1]];
    num += a[0] * (dst[i][0] - cd[0]) + a[1] * (dst[i][1] - cd[1]);
    den += a[0] * a[0] + a[1] * a[1];
  }
  const k = den < 1e-12 ? 1 : num / den;
  return { s: [k, 0], t: [cd[0] - k * cs[0], cd[1] - k * cs[1]] };
}

export function procrustes(src: readonly Vec2[], dst: readonly Vec2[]): Similarity {
  const cs = mean(src), cd = mean(dst);
  let num: Vec2 = [0, 0], den = 0;
  for (let i = 0; i < src.length; i++) {
    const a: Vec2 = [src[i][0] - cs[0], src[i][1] - cs[1]];
    const b: Vec2 = [dst[i][0] - cd[0], dst[i][1] - cd[1]];
    num = [num[0] + a[0] * b[0] + a[1] * b[1], num[1] + a[0] * b[1] - a[1] * b[0]];
    den += a[0] * a[0] + a[1] * a[1];
  }
  const s: Vec2 = den < 1e-12 ? [1, 0] : [num[0] / den, num[1] / den];
  const r = mul(s, cs);
  return { s, t: [cd[0] - r[0], cd[1] - r[1]] };
}
