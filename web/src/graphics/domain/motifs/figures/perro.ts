import { circle, type Shape, type Vec2 } from "../../shapes.ts";
import { a, defineMotif, sharp, strokeAt } from "./define.ts";
import { CHARACTER } from "./character.ts";
import { flowField } from "./flowField.ts";
import type { Ornament } from "./ornamentador.ts";

const INNER_LINES: Vec2[][] = [
  [[-0.17, -0.37], [-0.13, -0.46]],
  [[-0.1, 0.08], [-0.1, 0.3], [-0.12, 0.5]],
  [[0.04, 0.2], [0.2, 0.14], [0.3, 0.24], [0.34, 0.38], [0.4, 0.44]],
  [[-0.49, -0.07], [-0.42, -0.06]],
];

export const perro = defineMotif({
  id: "perro",
  name: "Perro sentado",
  tags: ["animal", "vigilancia", "memoria"],
  version: "1.1.0",
  anchors: [
    sharp(-0.5, -0.12), a(-0.42, -0.2), a(-0.3, -0.3), a(-0.22, -0.35), sharp(-0.12, -0.5), a(-0.05, -0.38), a(0.0, -0.28),
    a(0.08, -0.14), a(0.2, -0.04), a(0.3, 0.1), a(0.34, 0.22), a(0.42, 0.3), sharp(0.5, 0.24), a(0.49, 0.38), sharp(0.44, 0.5), sharp(0.08, 0.5), sharp(-0.26, 0.5), a(-0.23, 0.3), a(-0.21, 0.12), a(-0.27, 0.0), a(-0.35, -0.03), a(-0.45, -0.04),
  ],
  features: (fig, p) => {
    const eye = fig.at([-0.33, -0.2]);
    const nose = fig.at([-0.48, -0.13]);
    const shapes: Shape[] = [circle(eye[0], eye[1], fig.px(0.025), { fill: p.ink }), circle(nose[0], nose[1], fig.px(0.02), { fill: p.ink })];
    return shapes;
  },
  ornaments: (fig, p, rng) => {
    const out: Ornament[] = [];
    if (p.detail >= 2) out.push({ shapes: INNER_LINES.map((l) => strokeAt(fig, l, p.ink)), params: { innerLines: INNER_LINES.length } });
    if (p.detail >= 3) {
      const fill = { spacing: fig.px(CHARACTER.furSpacing), stepLen: fig.px(CHARACTER.furStep), style: { fill: "none", stroke: p.ink, strokeWidth: fig.inkWidth * 0.4, opacity: 0.55 } };
      out.push(flowField(fig.poly, rng, fill, CHARACTER.fur));
    }
    return out;
  },
  decision: (p) => `perro sentado de perfil mirando a la izquierda, oreja en punta y cola al suelo con la punta alzada; detail ${p.detail}: ${p.detail >= 2 ? "patas, oreja y boca" : "ojo y nariz"}${p.detail >= 3 ? " + pelaje por flow field (campo de ángulos sembrado)" : ""}`,
});
