import type { PathSegment, Vec2 } from "./shapes.ts";

export function polar(cx: number, cy: number, r: number, angle: number): Vec2 {
  return [cx + r * Math.cos(angle), cy + r * Math.sin(angle)];
}

export function midpoint(a: Vec2, b: Vec2): Vec2 {
  return [(a[0] + b[0]) / 2, (a[1] + b[1]) / 2];
}

export function regularPolygon(cx: number, cy: number, r: number, sides: number, rot = 0): Vec2[] {
  const pts: Vec2[] = [];
  for (let i = 0; i < sides; i++) pts.push(polar(cx, cy, r, (i * 2 * Math.PI) / sides - Math.PI / 2 + rot));
  return pts;
}

export function star(cx: number, cy: number, rOuter: number, rInner: number, tips: number, rot = 0): Vec2[] {
  const pts: Vec2[] = [];
  for (let i = 0; i < tips * 2; i++) {
    const r = i % 2 === 0 ? rOuter : rInner;
    pts.push(polar(cx, cy, r, (i * Math.PI) / tips - Math.PI / 2 + rot));
  }
  return pts;
}

export function logSpiral(cx: number, cy: number, a: number, b: number, turns: number, steps: number, mirror = false, rot = 0): Vec2[] {
  const pts: Vec2[] = [];
  const total = turns * 2 * Math.PI;
  for (let i = 0; i <= steps; i++) {
    const t = (i / steps) * total;
    pts.push(polar(cx, cy, a * Math.exp(b * t), (mirror ? -t : t) + rot));
  }
  return pts;
}

export function sineWave(cx: number, y: number, h: number, amp: number, cycles: number, phase: number, steps: number): Vec2[] {
  const pts: Vec2[] = [];
  for (let i = 0; i <= steps; i++) {
    const t = i / steps;
    pts.push([cx + amp * Math.sin(t * cycles * 2 * Math.PI + phase), y + h * t]);
  }
  return pts;
}

export function wedge(cx: number, cy: number, rIn: number, rOut: number, a0: number, a1: number): Vec2[] {
  return [polar(cx, cy, rIn, a0), polar(cx, cy, rOut, a0), polar(cx, cy, rOut, a1), polar(cx, cy, rIn, a1)];
}

export function arcSegments(cx: number, cy: number, r: number, pointed = false): PathSegment[] {
  if (!pointed) return [{ op: "M", p: [cx - r, cy] }, { op: "A", r, large: 0, sweep: 1, p: [cx + r, cy] }];
  const R = r * 1.3;
  return [
    { op: "M", p: [cx - r, cy] },
    { op: "A", r: R, large: 0, sweep: 1, p: [cx, cy - r * 1.25] },
    { op: "A", r: R, large: 0, sweep: 1, p: [cx + r, cy] },
  ];
}

export function pointedRingSegments(cx: number, cy: number, rOut: number, rIn: number): PathSegment[] {
  const Ro = rOut * 1.3;
  const Ri = rIn * 1.3;
  return [
    { op: "M", p: [cx - rOut, cy] },
    { op: "A", r: Ro, large: 0, sweep: 1, p: [cx, cy - rOut * 1.25] },
    { op: "A", r: Ro, large: 0, sweep: 1, p: [cx + rOut, cy] },
    { op: "L", p: [cx + rIn, cy] },
    { op: "A", r: Ri, large: 0, sweep: 0, p: [cx, cy - rIn * 1.25] },
    { op: "A", r: Ri, large: 0, sweep: 0, p: [cx - rIn, cy] },
    { op: "Z" },
  ];
}
