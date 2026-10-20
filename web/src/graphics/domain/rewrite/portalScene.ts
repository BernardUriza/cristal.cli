import { quad, type Part } from "../motifs/figures/parts.ts";
import { filled, line, polygon, type Shape, type Vec2 } from "../shapes.ts";
import { localPart } from "./localPart.ts";
import type { Producer } from "./rewrite.ts";
import { lerp } from "../../../shared/math.ts";

const BACK = 0.42;


/** T7: the flat cell opens into a room in one-point perspective holding two volumes, the near one hiding part of the far one. */
export function portalScene(): Producer {
  return (_source, { w, h }, env) => {
    const ink = env.ink;
    const vp: Vec2 = [w / 2, h * 0.45];
    const toward = (p: Vec2, t: number): Vec2 => [lerp(p[0], vp[0], t), lerp(p[1], vp[1], t)];
    const outer = quad(0, 0, w, h);
    const back = outer.map((p) => toward(p, BACK));
    const thin = { stroke: ink.ink, strokeWidth: ink.line * 0.4 };
    const shapes: Shape[] = [
      polygon(outer, filled(ink.deep, ink.ink, ink.line * 0.7)),
      polygon([outer[0], outer[3], back[3], back[0]], filled(ink.fill, ink.ink, ink.line * 0.5)),
      polygon([outer[1], outer[2], back[2], back[1]], filled(ink.fill, ink.ink, ink.line * 0.5)),
      polygon([outer[3], outer[2], back[2], back[3]], filled(ink.accent, ink.ink, ink.line * 0.5)),
      polygon(back, filled(ink.fill, ink.ink, ink.line * 0.5)),
    ];
    for (const t of [0.2, 0.4, 0.6, 0.8]) shapes.push(line([lerp(outer[3][0], outer[2][0], t), h], [lerp(back[3][0], back[2][0], t), back[3][1]], thin));
    const bw = back[1][0] - back[0][0];
    const bh = back[3][1] - back[0][1];
    const fx0 = back[0][0] + bw * 0.42;
    const fx1 = back[0][0] + bw * 0.92;
    const fy0 = back[0][1] + bh * 0.22;
    const fy1 = back[3][1];
    const depth = bw * 0.12;
    const farSide: Vec2[] = [[fx0, fy0], [fx0 - depth, fy0 + depth * 0.5], [fx0 - depth, fy1 + depth * 0.5], [fx0, fy1]];
    const farTop: Vec2[] = [[fx0, fy0], [fx1, fy0], [fx1 - depth, fy0 + depth * 0.5], [fx0 - depth, fy0 + depth * 0.5]];
    const far = localPart("volumen-fondo", "enclosure", "volumen", fx0 - depth, fy0, fx1, fy1 + depth * 0.5, [...farTop.slice(0, 2), [fx1, fy1], ...farSide.slice(2)]);
    const panel = localPart("panel", "enclosure", "panel", fx0, fy0, fx1, fy1);
    const nx0 = w * 0.16;
    const nx1 = w * 0.36;
    const ny0 = h * 0.3;
    const nd = (nx1 - nx0) * 0.35;
    const nearFront = quad(nx0, ny0, nx1, h * 0.96);
    const nearSide: Vec2[] = [[nx1, ny0], [nx1 + nd, ny0 - nd * 0.5], [nx1 + nd, h * 0.96 - nd * 0.5], [nx1, h * 0.96]];
    const nearTop: Vec2[] = [[nx0, ny0], [nx0 + nd, ny0 - nd * 0.5], [nx1 + nd, ny0 - nd * 0.5], [nx1, ny0]];
    const near = localPart("volumen-cerca", "support", "volumen", nx0, ny0 - nd * 0.5, nx1 + nd, h * 0.96, [nearFront[0], nearTop[1], nearTop[2], nearSide[2], nearFront[2], nearFront[3]]);
    const children: Part[] = [far, panel, near];
    const childShapes: Shape[][] = [
      [polygon(farSide, filled(ink.accent, ink.ink, ink.line * 0.5)), polygon(farTop, filled(ink.fill, ink.ink, ink.line * 0.5))],
      [polygon(panel.mask!, filled(ink.fill, ink.ink, ink.line * 0.5)), polygon(quad(lerp(fx0, fx1, 0.38), lerp(fy0, fy1, 0.45), lerp(fx0, fx1, 0.62), fy1), filled(ink.deep, ink.ink, ink.line * 0.4))],
      [polygon(nearSide, filled(ink.accent, ink.ink, ink.line * 0.5)), polygon(nearTop, filled(ink.fill, ink.ink, ink.line * 0.5)), polygon(nearFront, filled(ink.fill, ink.ink, ink.line * 0.6))],
    ];
    const part: Part = { id: "escena-portal", role: "connector", geometryId: "escena-portal", anchors: { vanishing: vp }, mask: outer, children };
    return { part, shapes, childShapes };
  };
}
