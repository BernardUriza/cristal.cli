import { logSpiral, polar, regularPolygon, star } from "../geometry.ts";
import { circle, filled, polygon, polyline, stroked, type Shape } from "../shapes.ts";
import type { Ornament } from "./ornament.ts";

export function fan(cx: number, cy: number, r: number, rays: number, from: number, span: number, o: Ornament): Shape[] {
  const out: Shape[] = [];
  for (let i = 0; i < rays; i++) {
    const a0 = from + (i * span) / rays;
    const a1 = from + ((i + 1) * span) / rays;
    out.push(polygon([[cx, cy], polar(cx, cy, r, a0), polar(cx, cy, r, a1)], filled(i % 2 ? o.ink.a : o.ink.b, o.ink.ink, o.sw)));
  }
  return out;
}

export function rosette(cx: number, cy: number, r: number, petals: number, o: Ornament): Shape[] {
  const out: Shape[] = [
    polygon(star(cx, cy, r, r * 0.55, petals), filled(o.ink.a, o.ink.ink, o.sw)),
    polygon(regularPolygon(cx, cy, r * 0.5, petals, Math.PI / petals), filled(o.ink.b, o.ink.ink, o.sw)),
  ];
  if (o.level > 1 && o.shows(r * 0.3)) {
    out.push(circle(cx, cy, r * 0.22, filled(o.ink.c, o.ink.ink, o.sw)));
    for (let i = 0; i < petals; i++) {
      const [px, py] = polar(cx, cy, r * 0.78, (i * 2 * Math.PI) / petals - Math.PI / 2);
      out.push(circle(px, py, r * 0.07, { fill: o.ink.ink }));
    }
  }
  return out;
}

export function volutePair(cx: number, cy: number, r: number, o: Ornament): Shape[] {
  const out: Shape[] = [];
  for (const side of [-1, 1]) {
    const vx = cx + side * r * 1.9;
    out.push(polyline(logSpiral(vx, cy, r * 0.12, 0.28, 1.6, 48, side < 0, Math.PI), stroked(o.ink.ink, o.sw)));
    if (o.level > 1 && o.shows(r * 0.4)) {
      out.push(polyline(logSpiral(vx, cy, r * 0.06, 0.28, 1.2, 32, side < 0, Math.PI), stroked(o.ink.c, o.sw * 0.8)));
      out.push(circle(vx, cy, r * 0.1, { fill: o.ink.ink }));
    }
  }
  return out;
}

export function sierpinski(cx: number, cy: number, r: number, depth: number, fill: string, o: Ornament): Shape[] {
  const out: Shape[] = [];
  const tri = (x: number, y: number, s: number, d: number) => {
    if (d === 0 || !o.shows(s)) {
      out.push(polygon(regularPolygon(x, y, s, 3), filled(fill, o.ink.ink, o.sw)));
      return;
    }
    const h = s / 2;
    tri(x, y - h, h, d - 1);
    tri(x - h * Math.cos(Math.PI / 6), y + h / 2, h, d - 1);
    tri(x + h * Math.cos(Math.PI / 6), y + h / 2, h, d - 1);
  };
  tri(cx, cy, r, depth);
  return out;
}

export function sunburst(cx: number, cy: number, r: number, rays: number, fillA: string, fillB: string, o: Ornament): Shape[] {
  const out: Shape[] = [];
  for (let i = 0; i < rays; i++) {
    const a = (i * 2 * Math.PI) / rays;
    const len = i % 2 === 0 ? r * 2.1 : r * 1.5;
    const w = Math.PI / rays / 2.2;
    out.push(polygon([polar(cx, cy, r, a - w), polar(cx, cy, len, a), polar(cx, cy, r, a + w)], filled(i % 2 === 0 ? fillA : fillB, o.ink.ink, o.sw, { join: "round" })));
  }
  return out;
}

export function concentricRings(cx: number, cy: number, maxR: number, count: number, o: Ornament, glow = false): Shape[] {
  const out: Shape[] = [];
  for (let i = 1; i <= count; i++) {
    const opacity = Number((1 - ((i - 1) / count) * 0.6).toFixed(2));
    out.push(circle(cx, cy, (maxR * i) / count, stroked(o.ink.ink, o.sw, { opacity, glow })));
  }
  return out;
}

export function radialLines(cx: number, cy: number, r: number, count: number, o: Ornament, from = 0, span = 2 * Math.PI, glow = false): Shape[] {
  const closed = span >= 2 * Math.PI - 1e-9;
  const steps = closed ? count : count - 1;
  const out: Shape[] = [];
  for (let i = 0; i < count; i++) {
    const a = from + (i * span) / Math.max(steps, 1);
    out.push({ kind: "line", a: [cx, cy], b: polar(cx, cy, r, a), style: stroked(o.ink.ink, o.sw, { glow }) });
  }
  return out;
}
