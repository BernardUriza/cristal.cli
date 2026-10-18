import { ellipse, type Shape, type Vec2 } from "../../shapes.ts";
import { a, defineMotif, sharp, strokeAt } from "./define.ts";
import { CHARACTER } from "./character.ts";
import type { Ornament } from "./ornamentador.ts";
import { quad, type PartSpec } from "./parts.ts";
import { flowTexture } from "./texture.ts";

type Finger = { cx: number; w: number; tip: number; base: number };
const FINGERS: Finger[] = [
  { cx: -0.235, w: 0.12, tip: -0.45, base: -0.14 },
  { cx: -0.065, w: 0.12, tip: -0.5, base: -0.17 },
  { cx: 0.11, w: 0.12, tip: -0.46, base: -0.16 },
  { cx: 0.29, w: 0.11, tip: -0.36, base: -0.12 },
];

const PALM_LINES: Vec2[][] = [
  [[-0.18, -0.06], [-0.22, 0.1], [-0.17, 0.28], [-0.08, 0.42]],
  [[-0.2, -0.02], [0.0, 0.05], [0.25, 0.12]],
  [[-0.06, -0.1], [0.12, -0.08], [0.3, -0.01]],
];

function creases(): Vec2[][] {
  const out: Vec2[][] = [];
  for (const f of FINGERS) {
    for (const t of [0.36, 0.68]) {
      const y = f.tip + (f.base - f.tip) * t;
      out.push([[f.cx - f.w * 0.42, y], [f.cx + f.w * 0.42, y]]);
    }
  }
  out.push([[-0.42, -0.02], [-0.37, 0.06]]);
  return out;
}

export const mano = defineMotif({
  id: "mano",
  name: "Mano abierta",
  tags: ["cuerpo", "memoria", "transformación"],
  version: "1.1.0",
  role: "span",
  parts: [
    { id: "palma", role: "enclosure", mask: [[-0.3, -0.12], [0.34, -0.12], [0.3, 0.3], [0.18, 0.48], [-0.16, 0.48], [-0.22, 0.26], [-0.3, 0.1]] },
    ...FINGERS.map((f, i): PartSpec => ({ id: `dedo${i + 1}`, role: "support", anchors: { tip: [f.cx, f.tip], base: [f.cx, f.base] }, mask: quad(f.cx - f.w / 2, f.tip, f.cx + f.w / 2, f.base) })),
    { id: "pulgar", role: "connector", anchors: { tip: [-0.48, -0.08], base: [-0.26, 0.1] } },
  ],
  regions: { cabeza: [-0.28, -0.1], tronco: [0.36, -0.1], punta: [0.28, 0.35], extremidad: [-0.22, 0.3] },
  anchors: [
    sharp(-0.18, 0.5), a(-0.22, 0.3), a(-0.24, 0.26), a(-0.36, 0.12), a(-0.48, -0.02), a(-0.5, -0.1), a(-0.44, -0.14), a(-0.33, -0.06),
    sharp(-0.28, -0.1), a(-0.3, -0.16), a(-0.31, -0.38), a(-0.27, -0.45), a(-0.2, -0.45), a(-0.17, -0.38), sharp(-0.16, -0.16),
    a(-0.13, -0.19), a(-0.14, -0.44), a(-0.1, -0.5), a(-0.03, -0.5), a(0.0, -0.44), sharp(0.01, -0.18),
    a(0.04, -0.18), a(0.04, -0.4), a(0.08, -0.46), a(0.15, -0.46), a(0.18, -0.4), sharp(0.19, -0.15),
    a(0.22, -0.14), a(0.23, -0.3), a(0.27, -0.36), a(0.33, -0.36), a(0.36, -0.3), a(0.36, -0.1),
    a(0.33, 0.1), a(0.28, 0.35), sharp(0.2, 0.5),
  ],
  features: () => [],
  ornaments: (fig, p, rng) => {
    const out: Ornament[] = [];
    if (p.detail >= 2) {
      const palm = PALM_LINES.map((l) => strokeAt(fig, l, p.ink));
      const folds = creases().map((l) => strokeAt(fig, l, p.ink, fig.inkWidth * 0.7));
      out.push({ shapes: [...palm, ...folds], params: { palmLines: PALM_LINES.length, creases: folds.length } });
    }
    if (p.detail >= 3) {
      const skin = flowTexture(fig, fig.poly, rng, CHARACTER.skin, p.ink);
      out.push({ shapes: skin.shapes, params: { ...skin.params, flowTexture: "piel" } });
      const nails: Shape[] = FINGERS.map((f) => {
        const c = fig.at([f.cx, f.tip + 0.045]);
        return ellipse(c[0], c[1], fig.px(f.w * 0.3), fig.px(0.035), { fill: p.accent, stroke: p.ink, strokeWidth: fig.inkWidth * 0.6 });
      });
      const thumb = fig.at([-0.46, -0.08]);
      nails.push(ellipse(thumb[0], thumb[1], fig.px(0.03), fig.px(0.035), { fill: p.accent, stroke: p.ink, strokeWidth: fig.inkWidth * 0.6 }));
      out.push({ shapes: nails, params: { nails: nails.length } });
    }
    return out;
  },
  decision: (p) => `mano abierta de ${FINGERS.length + 1} dedos; detail ${p.detail}: ${p.detail >= 2 ? "líneas de la palma y pliegues" : "solo contorno"}${p.detail >= 3 ? " + piel por flow field y uñas" : ""}`,
});
