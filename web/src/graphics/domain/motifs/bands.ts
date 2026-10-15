import { sineWave } from "../geometry.ts";
import { circle, filled, polygon, polyline, rect, stroked, type Shape, type Vec2 } from "../shapes.ts";
import type { Ornament } from "./ornament.ts";

export function greca(x: number, y: number, w: number, h: number, cells: number, o: Ornament): Shape[] {
  const u = w / cells;
  const k = u / 4;
  const pts: Vec2[] = [[x, y + h]];
  for (let i = 0; i < cells; i++) {
    const ox = x + i * u;
    pts.push([ox, y], [ox + 3 * k, y], [ox + 3 * k, y + h * 0.65], [ox + k, y + h * 0.65], [ox + k, y + h * 0.33], [ox + 2 * k, y + h * 0.33], [ox + 2 * k, y + h * 0.5], [ox + 4 * k, y + h * 0.5], [ox + 4 * k, y + h]);
  }
  return [rect(x, y, w, h, filled(o.ink.b, o.ink.ink, o.sw)), polyline(pts, stroked(o.ink.ink, o.sw, { join: "miter" }))];
}

export function chevronBand(x: number, y: number, w: number, h: number, cells: number, o: Ornament, dots = false): Shape[] {
  const u = w / cells;
  const out: Shape[] = [rect(x, y, w, h, filled(o.ink.a, o.ink.ink, o.sw))];
  for (let i = 0; i < cells; i++) {
    const ox = x + i * u;
    out.push(polygon([[ox, y + h], [ox + u / 2, y], [ox + u, y + h]], filled(o.ink.b, o.ink.ink, o.sw)));
    if (dots) out.push(circle(ox + u / 2, y + h * 0.62, u * 0.1, { fill: o.ink.ink }));
  }
  return out;
}

export function helixBand(x: number, y: number, w: number, h: number, turns: number, o: Ornament): Shape[] {
  const steps = Math.max(8, Math.round(turns * 12));
  const amp = w * 0.5;
  const cx = x + w / 2;
  const curve = (phase: number) => sineWave(cx, y, h, amp, turns, phase, steps);
  const band = [...curve(0), ...curve(Math.PI).reverse()];
  return [
    rect(x, y, w, h, filled(o.ink.a, o.ink.ink, o.sw)),
    polygon(band, filled(o.ink.b, o.ink.ink, o.sw, { join: "round" })),
    polyline(curve(Math.PI / 2), stroked(o.ink.ink, o.sw, { opacity: 0.7 })),
  ];
}

export function dotRow(x: number, y: number, w: number, n: number, r: number, fill: string): Shape[] {
  const out: Shape[] = [];
  for (let i = 0; i < n; i++) out.push(circle(x + (w / n) * (i + 0.5), y, r, { fill }));
  return out;
}

export function flutes(x: number, y: number, w: number, h: number, count: number, o: Ornament): Shape[] {
  const out: Shape[] = [];
  for (let k = 1; k <= count; k++) {
    const fx = x + (w / (count + 1)) * k;
    out.push({ kind: "line", a: [fx, y], b: [fx, y + h], style: stroked(o.ink.ink, o.sw, { opacity: 0.6 }) });
  }
  return out;
}
