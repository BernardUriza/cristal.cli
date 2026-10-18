import { quad, type Part } from "../motifs/figures/parts.ts";
import { filled, polygon, stroked, type Shape, type Vec2 } from "../shapes.ts";
import { localPart } from "./localPart.ts";
import type { Producer } from "./rewrite.ts";

const SPANS = [0.6, 2.2, 0.6];

/** T6: the piece becomes a small temple whose stylobate sits on the piece's base and whose pediment rises past it, changing the parent's outline. */
export function miniTemple(rise: number): Producer {
  return (_source, { w, h }, env) => {
    const ink = env.ink;
    const H = h * rise;
    const at = (k: number) => h - k * H;
    const colW = w * 0.06;
    const free = w * 0.9 - colW * 4;
    const unit = free / SPANS.reduce((a, b) => a + b, 0);
    const outline: Vec2[] = [[0, h], [w, h], [w, at(0.74)], [w / 2, at(1)], [0, at(0.74)]];
    const shapes: Shape[] = [
      polygon(quad(w * 0.05, at(0.6), w * 0.95, at(0.1)), filled(ink.deep, ink.ink, ink.line * 0.5)),
      polygon(quad(0, at(0.1), w, h), filled(ink.accent, ink.ink, ink.line * 0.7)),
    ];
    const children: Part[] = [];
    const childShapes: Shape[][] = [];
    let cursor = w * 0.05;
    for (let i = 0; i < 4; i++) {
      shapes.push(polygon(quad(cursor, at(0.6), cursor + colW, at(0.1)), filled(ink.fill, ink.ink, ink.line * 0.6)));
      cursor += colW;
      if (i === 3) break;
      const span = unit * SPANS[i];
      const opening = localPart(`ventana${i + 1}`, "opening", "ventana", cursor, at(0.6), cursor + span, at(0.1));
      children.push(opening);
      childShapes.push([polygon(opening.mask!, filled(ink.deep, ink.ink, ink.line * 0.4))]);
      cursor += span;
    }
    shapes.push(polygon(quad(0, at(0.74), w, at(0.6)), filled(ink.fill, ink.ink, ink.line * 0.7)));
    const cellW = w / 3;
    for (let i = 0; i < 3; i++) {
      const cell = localPart(`celda${i + 1}`, "connector", "celda-friso", i * cellW + cellW * 0.08, at(0.72), (i + 1) * cellW - cellW * 0.08, at(0.62));
      children.push(cell);
      childShapes.push([polygon(cell.mask!, stroked(ink.ink, ink.line * 0.4))]);
    }
    shapes.push(polygon([[0, at(0.74)], [w / 2, at(1)], [w, at(0.74)]], filled(ink.accent, ink.ink, ink.line * 0.8)));
    shapes.push(polygon([[w * 0.2, at(0.76)], [w / 2, at(0.94)], [w * 0.8, at(0.76)]], stroked(ink.ink, ink.line * 0.4)));
    const part: Part = { id: "mini-templo", role: "crown", geometryId: "mini-templo", anchors: { base: [w / 2, h], apex: [w / 2, at(1)] }, mask: outline, children };
    return { part, shapes, childShapes };
  };
}
