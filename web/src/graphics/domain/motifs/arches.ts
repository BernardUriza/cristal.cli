import { arcSegments, pointedRingSegments, polar, regularPolygon, wedge } from "../geometry.ts";
import { filled, path, polygon, stroked, type PathSegment, type Shape, type Style } from "../shapes.ts";
import type { Ornament } from "./ornament.ts";
import { rosette } from "./radial.ts";

export function archedOpening(cx: number, cy: number, r: number, bottomY: number, style: Style, pointed = false): Shape {
  const segments: PathSegment[] = [...arcSegments(cx, cy, r, pointed), { op: "L", p: [cx + r, bottomY] }, { op: "L", p: [cx - r, bottomY] }, { op: "Z" }];
  return path(segments, style);
}

export function arcLine(cx: number, cy: number, r: number, style: Style, pointed = false): Shape {
  return path(arcSegments(cx, cy, r, pointed), style);
}

export function halfDisc(cx: number, cy: number, r: number, style: Style): Shape {
  return path([...arcSegments(cx, cy, r), { op: "Z" }], style);
}

export function pointedRing(cx: number, cy: number, rOut: number, rIn: number, style: Style): Shape {
  return path(pointedRingSegments(cx, cy, rOut, rIn), style);
}

export function nestedArches(cx: number, cy: number, r: number, count: number, o: Ornament, pointed = false): Shape[] {
  const out: Shape[] = [];
  for (let k = 1; k <= count; k++) {
    const rk = r * (1 - 0.12 * k);
    out.push(arcLine(cx, cy, rk, stroked(k % 2 ? o.ink.c : o.ink.ink, Number((o.sw * (1.6 - k * 0.2)).toFixed(2))), pointed));
  }
  return out;
}

export function voussoirs(cx: number, cy: number, rIn: number, rOut: number, n: number, o: Ornament): Shape[] {
  const out: Shape[] = [];
  for (let i = 0; i < n; i++) {
    const a0 = Math.PI + (i * Math.PI) / n;
    const a1 = Math.PI + ((i + 1) * Math.PI) / n;
    const key = i === Math.floor(n / 2);
    out.push(polygon(wedge(cx, cy, rIn, rOut, a0, a1), filled(key ? o.ink.c : i % 2 === 0 ? o.ink.a : o.ink.b, o.ink.ink, o.sw)));
    const size = (rOut - rIn) * 0.22;
    if (o.level > 1 && o.shows(size * 2, 4)) {
      const am = (a0 + a1) / 2;
      const [mx, my] = polar(cx, cy, (rIn + rOut) / 2, am);
      if (key && o.level > 2) out.push(...rosette(mx, my, size * 1.6, 6, { ...o, sw: o.sw * 0.7, level: o.level - 1 }));
      else out.push(polygon(regularPolygon(mx, my, size, 4, am), { fill: o.ink.ink }));
    }
  }
  return out;
}
