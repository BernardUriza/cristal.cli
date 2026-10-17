import { circle, type Shape, type Vec2 } from "../../shapes.ts";
import { a, defineMotif, sharp, strokeAt } from "./define.ts";
import { scales, type Ornament } from "./ornamentador.ts";

const HIP_Y = 0.12;
const HAIR: Vec2[][] = [[[-0.02, -0.5], [-0.1, -0.44], [-0.09, -0.3], [-0.14, -0.2]], [[-0.07, -0.5], [-0.15, -0.42], [-0.16, -0.28], [-0.2, -0.18]], [[-0.12, -0.49], [-0.19, -0.38], [-0.2, -0.26]]];
const FLUKE: Vec2[][] = [[[0.38, 0.41], [0.48, 0.32]], [[0.38, 0.42], [0.44, 0.41]], [[0.38, 0.43], [0.47, 0.49]]];

function tailRegion(poly: Vec2[], hipY: number): Vec2[] {
  return poly.filter((p) => p[1] > hipY);
}

export const sirena = defineMotif({
  id: "sirena",
  name: "Sirena",
  tags: ["transformación", "sueño", "cuerpo"],
  version: "1.0.0",
  role: "connector",
  parts: [
    { id: "torso", role: "enclosure", anchors: { neck: [0.04, -0.29], hip: [0, HIP_Y] }, mask: [[-0.16, -0.27], [0.16, -0.27], [0.24, -0.1], [0.14, HIP_Y], [-0.12, HIP_Y], [-0.2, -0.1]] },
    { id: "cola", role: "support", anchors: { hip: [0, HIP_Y], fluke: [0.44, 0.42] }, mask: [[-0.12, HIP_Y], [0.14, HIP_Y], [0.2, 0.28], [0.37, 0.4], [0.49, 0.5], [0.26, 0.43], [0.03, 0.26]] },
  ],
  anchors: [
    a(0.0, -0.5), a(0.1, -0.46), a(0.12, -0.37), a(0.07, -0.3), a(0.05, -0.28), a(0.2, -0.26), a(0.26, -0.12), a(0.25, 0.04), a(0.21, 0.09),
    a(0.17, 0.02), sharp(0.14, -0.16), a(0.13, -0.03), a(0.11, 0.06), a(0.17, 0.17), a(0.2, 0.28), a(0.28, 0.36), a(0.37, 0.4), sharp(0.5, 0.3),
    sharp(0.44, 0.41), sharp(0.49, 0.5), a(0.36, 0.47), a(0.26, 0.43), a(0.14, 0.36), a(0.03, 0.26), a(-0.08, 0.16), a(-0.14, 0.08), a(-0.11, -0.02),
    sharp(-0.14, -0.16), a(-0.17, 0.02), a(-0.22, 0.08), a(-0.26, 0.02), a(-0.27, -0.14), a(-0.25, -0.22), a(-0.24, -0.3), a(-0.22, -0.4), a(-0.16, -0.48),
    a(-0.08, -0.51),
  ],
  features: (fig, p) => {
    const eye = fig.at([0.04, -0.42]);
    const shapes: Shape[] = [circle(eye[0], eye[1], fig.px(0.012), { fill: p.ink })];
    return shapes;
  },
  ornaments: (fig, p) => {
    const out: Ornament[] = [];
    if (p.detail >= 2) {
      const tail = tailRegion(fig.poly, fig.at([0, HIP_Y])[1]);
      const rowH = fig.px(p.detail === 2 ? 0.036 : 0.026);
      const sc = scales(tail, rowH, { fill: "none", stroke: p.ink, strokeWidth: fig.inkWidth * 0.6 });
      const waist = strokeAt(fig, [[-0.12, HIP_Y - 0.02], [0, HIP_Y + 0.02], [0.14, HIP_Y - 0.02]], p.ink);
      const strands = HAIR.map((h) => strokeAt(fig, h, p.ink, fig.inkWidth * 0.7));
      out.push({ shapes: [waist, ...strands, ...sc.shapes], params: { hairStrands: HAIR.length, ...sc.params } });
    }
    if (p.detail >= 3) {
      const fluke = FLUKE.map((f) => strokeAt(fig, f, p.ink, fig.inkWidth * 0.7));
      const face = strokeAt(fig, [[0.1, -0.44], [0.12, -0.4], [0.1, -0.37]], p.ink, fig.inkWidth * 0.6);
      out.push({ shapes: [...fluke, face], params: { flukeLines: FLUKE.length } });
    }
    return out;
  },
  decision: (p) => `sirena de frente, cola hacia la derecha con aleta; detail ${p.detail}: ${p.detail >= 2 ? "escamas en arcos desde la cadera y mechones" : "solo contorno"}${p.detail >= 3 ? " + perfil y nervaduras de la aleta" : ""}`,
});
