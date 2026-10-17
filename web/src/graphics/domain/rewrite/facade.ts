import { pointInPolygon, polygonBounds } from "../bezier.ts";
import { boxAnchors, quad, type Part } from "../motifs/figures/parts.ts";
import { filled, line, polygon, type Shape, type Vec2 } from "../shapes.ts";
import type { Ink, Producer } from "./rewrite.ts";

const clamp = (v: number, lo: number, hi: number) => Math.max(lo, Math.min(hi, v));

function arched(x0: number, y0: number, x1: number, y1: number): Vec2[] {
  const r = (x1 - x0) / 2;
  const cx = (x0 + x1) / 2;
  const arc: Vec2[] = Array.from({ length: 7 }, (_, i): Vec2 => [cx - r * Math.cos((i / 6) * Math.PI), y0 + r - r * Math.sin((i / 6) * Math.PI)]);
  return [[x0, y1], ...arc, [x1, y1]];
}

function opening(id: string, mask: Vec2[], ink: Ink): { part: Part; shape: Shape } {
  return { part: { id, role: "opening", geometryId: id.replace(/\d+$/, ""), anchors: boxAnchors(mask), mask, children: [] }, shape: polygon(mask, filled(ink.deep, ink.ink, ink.line * 0.8)) };
}

/** T2: the torso keeps its bodily silhouette, its interior becomes storeys of windows, a door at the lower centre, the head as crown. */
export function facade(cellPx: number): Producer {
  return (_source, { w, h, mask, pxPerUnit }, env) => {
    const sil = mask ?? quad(0, 0, w, h);
    const b = polygonBounds(sil);
    const cell = cellPx / pxPerUnit;
    const cols = clamp(Math.round((b.maxX - b.minX) / cell), 2, 6);
    const rows = clamp(Math.round((b.maxY - b.minY) / cell), 2, 7);
    const cw = (b.maxX - b.minX) / cols;
    const ch = (b.maxY - b.minY) / rows;
    const shapes: Shape[] = [polygon(sil, filled(env.ink.fill, env.ink.ink, env.ink.line, { join: "round" }))];
    const children: Part[] = [];
    const door = opening("puerta", arched(b.minX + (b.maxX - b.minX) * 0.4, b.maxY - ch * 1.1, b.minX + (b.maxX - b.minX) * 0.6, b.maxY - ch * 0.05), env.ink);
    for (let r = 1; r < rows; r++) shapes.push(line([b.minX, b.minY + r * ch], [b.maxX, b.minY + r * ch], { stroke: env.ink.ink, strokeWidth: env.ink.line * 0.6 }));
    for (let r = 0; r < rows - 1; r++) {
      for (let c = 0; c < cols; c++) {
        const x0 = b.minX + c * cw + cw * 0.22;
        const y0 = b.minY + r * ch + ch * 0.2;
        const win = arched(x0, y0, x0 + cw * 0.56, y0 + ch * 0.66);
        if (!win.every((p) => pointInPolygon(p, sil))) continue;
        const o = opening(`ventana${children.length + 1}`, win, env.ink);
        shapes.push(o.shape);
        children.push(o.part);
      }
    }
    shapes.push(door.shape);
    children.push(door.part);
    const cx = (b.minX + b.maxX) / 2;
    const cy = (b.minY + b.maxY) / 2;
    const part: Part = { id: "fachada", role: "enclosure", geometryId: "fachada", anchors: { crown: [cx, b.minY], door: [cx, b.maxY], wingLeft: [b.minX, cy], wingRight: [b.maxX, cy] }, mask: sil, children };
    return { part, shapes };
  };
}
