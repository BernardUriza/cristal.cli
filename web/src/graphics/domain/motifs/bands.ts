import { sineWave } from "../geometry.ts";
import { circle, filled, group, polygon, polyline, rect, stroked, type Shape, type Vec2 } from "../shapes.ts";
import { cutCells, type BandDrawing } from "./bandDisorder.ts";
import type { DisorderInput, RepeatedItem } from "./disorder.ts";
import type { Ornament } from "./ornament.ts";

export type { BandDrawing };

function grecaCells(x: number, y: number, w: number, h: number, cells: number): Vec2[][] {
  const u = w / cells;
  const k = u / 4;
  const out: Vec2[][] = [];
  let prev: Vec2 = [x, y + h];
  for (let i = 0; i < cells; i++) {
    const ox = x + i * u;
    const cell: Vec2[] = [prev, [ox, y], [ox + 3 * k, y], [ox + 3 * k, y + h * 0.65], [ox + k, y + h * 0.65], [ox + k, y + h * 0.33], [ox + 2 * k, y + h * 0.33], [ox + 2 * k, y + h * 0.5], [ox + 4 * k, y + h * 0.5], [ox + 4 * k, y + h]];
    out.push(cell);
    prev = cell[cell.length - 1];
  }
  return out;
}

/** Greca cut per cell; with nothing interrupted it stays one polyline, byte for byte the previous drawing. */
export function grecaBand(x: number, y: number, w: number, h: number, cells: number, o: Ornament, disorder?: DisorderInput): BandDrawing {
  const style = stroked(o.ink.ink, o.sw, { join: "miter" });
  const u = w / cells;
  const pts = grecaCells(x, y, w, h, cells);
  const items = pts.map((c, i): RepeatedItem => ({ shape: polyline(c, style), pivot: [x + (i + 0.5) * u, y + h / 2] }));
  const joined = (): Shape[] => [polyline([[x, y + h], ...pts.flatMap((c) => c.slice(1))], style)];
  const cut = cutCells("greca", items, joined, disorder, Math.min(u, h));
  return { shapes: [rect(x, y, w, h, filled(o.ink.b, o.ink.ink, o.sw)), ...cut.shapes], params: cut.params };
}

export function greca(x: number, y: number, w: number, h: number, cells: number, o: Ornament, disorder?: DisorderInput): Shape[] {
  return grecaBand(x, y, w, h, cells, o, disorder).shapes;
}

export function chevronCells(x: number, y: number, w: number, h: number, cells: number, o: Ornament, dots = false, disorder?: DisorderInput): BandDrawing {
  const u = w / cells;
  const perCell: Shape[][] = [];
  for (let i = 0; i < cells; i++) {
    const ox = x + i * u;
    const one: Shape[] = [polygon([[ox, y + h], [ox + u / 2, y], [ox + u, y + h]], filled(o.ink.b, o.ink.ink, o.sw))];
    if (dots) one.push(circle(ox + u / 2, y + h * 0.62, u * 0.1, { fill: o.ink.ink }));
    perCell.push(one);
  }
  const items = perCell.map((c, i): RepeatedItem => ({ shape: c.length === 1 ? c[0] : group([], c), pivot: [x + (i + 0.5) * u, y + h / 2] }));
  const cut = cutCells("chevron", items, () => perCell.flat(), disorder, Math.min(u, h));
  return { shapes: [rect(x, y, w, h, filled(o.ink.a, o.ink.ink, o.sw)), ...cut.shapes], params: cut.params };
}

export function chevronBand(x: number, y: number, w: number, h: number, cells: number, o: Ornament, dots = false, disorder?: DisorderInput): Shape[] {
  return chevronCells(x, y, w, h, cells, o, dots, disorder).shapes;
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
