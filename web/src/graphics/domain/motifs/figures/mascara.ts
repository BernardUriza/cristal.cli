import { mirrorAnchors } from "../../bezier.ts";
import { line, polygon, type Shape, type Vec2 } from "../../shapes.ts";
import { a, defineMotif, lens, strokeAt } from "./define.ts";
import { contourLines, hatch, type Ornament } from "./ornamentador.ts";
import type { PartSpec } from "./parts.ts";

const EYE: Vec2 = [0.2, -0.12];
const CHEEK: Vec2[] = [[0.24, 0.02], [0.42, 0.04], [0.38, 0.3], [0.2, 0.2]];
const NOSE: Vec2[] = [[-0.04, -0.08], [-0.07, 0.1], [0, 0.14], [0.07, 0.1], [0.04, -0.08]];

function foreheadRays(count: number): Vec2[][] {
  const out: Vec2[][] = [];
  for (let i = 0; i < count; i++) {
    const t = -1 + (2 * i) / (count - 1);
    out.push([[t * 0.06, -0.26], [t * 0.3, -0.42 + Math.abs(t) * 0.08]]);
  }
  return out;
}

export const mascara = defineMotif({
  id: "mascara",
  name: "Máscara",
  tags: ["transformación", "sueño", "vigilancia"],
  version: "1.0.0",
  role: "crown",
  parts: [
    ...[-1, 1].map((s, i): PartSpec => ({ id: `ojo${i + 1}`, role: "opening", mask: lens(EYE[0] * s, EYE[1], 0.26, 0.13, true) })),
    { id: "boca", role: "opening", mask: lens(0, 0.26, 0.42, 0.1, true) },
  ],
  regions: { cabeza: [-0.4, -0.36], tronco: [0.4, -0.36], punta: [0.33, 0.36], extremidad: [-0.33, 0.36] },
  anchors: mirrorAnchors([a(0, -0.5), a(0.2, -0.47), a(0.4, -0.36), a(0.48, -0.12), a(0.45, 0.14), a(0.33, 0.36), a(0.14, 0.48), a(0, 0.5)]),
  features: (fig, p) => {
    const holes: Shape[] = [-1, 1].map((s) => polygon(lens(EYE[0] * s, EYE[1], 0.26, 0.13, true).map(fig.at), { fill: p.ink }));
    holes.push(polygon(lens(0, 0.26, 0.42, 0.1, true).map(fig.at), { fill: p.ink }));
    return holes;
  },
  ornaments: (fig, p) => {
    const out: Ornament[] = [];
    if (p.detail >= 2) {
      const rays = foreheadRays(7).map(([q0, q1]) => line(fig.at(q0), fig.at(q1), { stroke: p.ink, strokeWidth: fig.inkWidth * 0.8 }));
      out.push({ shapes: [strokeAt(fig, NOSE, p.ink), ...rays], params: { foreheadRays: 7, noseSegments: NOSE.length - 1 } });
    }
    if (p.detail >= 3) {
      const cheeks = [1, -1].flatMap((s) => hatch(CHEEK.map((q) => fig.at([q[0] * s, q[1]])), fig.px(0.028), 35 * s, { stroke: p.ink, strokeWidth: fig.inkWidth * 0.5, opacity: 0.7 }).shapes);
      const rim = contourLines(fig.poly, 1, { fill: "none", stroke: p.accent, strokeWidth: fig.inkWidth * 0.8 });
      out.push({ shapes: [...cheeks, ...rim.shapes], params: { hatchSpacing: Number(fig.px(0.028).toFixed(1)), hatchAngle: 35, ...rim.params } });
    }
    return out;
  },
  decision: (p) => `máscara simétrica (espejo del lado derecho) con ojos y boca recortados; detail ${p.detail}: ${p.detail >= 2 ? "nariz y rayos de la frente" : "solo recortes"}${p.detail >= 3 ? " + mejillas rayadas y borde interior" : ""}`,
});
