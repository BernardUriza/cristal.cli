import { quad, type Part } from "../motifs/figures/parts.ts";
import { filled, line, polygon, type Shape, type Vec2 } from "../shapes.ts";
import { archedTop, localPart } from "./localPart.ts";
import type { Producer } from "./rewrite.ts";

const EAVE = 0.5;
const RIDGE = 0.3;

/** T5: the panel becomes a small building standing on its lower edge: entrance, gabled roof, two windows; the panel's bounds stay its sky. */
export function miniBuilding(): Producer {
  return (_source, { w, h }, env) => {
    const ink = env.ink;
    const x = (u: number) => u * w;
    const y = (v: number) => v * h;
    const sky = quad(0, 0, w, h);
    const body = quad(x(0.14), y(EAVE), x(0.86), y(0.95));
    const shapes: Shape[] = [
      polygon(sky, filled(ink.fill, ink.ink, ink.line * 0.6)),
      polygon(body, filled(ink.fill, ink.ink, ink.line * 0.8)),
      line([x(0.14), y(EAVE + 0.05)], [x(0.86), y(EAVE + 0.05)], { stroke: ink.ink, strokeWidth: ink.line * 0.5 }),
      polygon(quad(x(0.08), y(0.95), x(0.92), h), filled(ink.accent, ink.ink, ink.line * 0.6)),
    ];
    const gable: Vec2[] = [[x(0.1), y(EAVE)], [x(0.5), y(RIDGE)], [x(0.9), y(EAVE)]];
    const roof = localPart("cubierta", "crown", "cubierta", x(0.1), y(RIDGE), x(0.9), y(EAVE), gable, { base: [x(0.5), y(EAVE)] });
    const windows = [0.22, 0.6].map((u, i) => localPart(`ventana${i + 1}`, "opening", "ventana", x(u), y(0.58), x(u + 0.18), y(0.78)));
    const door = localPart("puerta", "opening", "puerta", x(0.42), y(0.72), x(0.58), y(0.95), archedTop(x(0.42), y(0.72), x(0.58), y(0.95)));
    const children: Part[] = [roof, ...windows, door];
    const childShapes: Shape[][] = [
      [polygon(gable, filled(ink.accent, ink.ink, ink.line * 0.8))],
      ...windows.map((p) => [polygon(p.mask!, filled(ink.deep, ink.ink, ink.line * 0.5))]),
      [polygon(door.mask!, filled(ink.deep, ink.ink, ink.line * 0.6))],
    ];
    const part: Part = { id: "mini-edificio", role: "enclosure", geometryId: "mini-edificio", anchors: { base: [x(0.5), h], door: door.anchors.bottom, crown: [x(0.5), y(RIDGE)] }, mask: sky, children };
    return { part, shapes, childShapes };
  };
}
