import { pointInPolygon } from "../../bezier.ts";
import { circle, line, type Shape, type Vec2 } from "../../shapes.ts";
import { a, defineMotif, sharp, strokeAt } from "./define.ts";
import { phyllotaxis, stipple, type Ornament } from "./ornamentador.ts";

const WHISKERS: Vec2[][] = [[[-0.46, -0.04], [-0.38, -0.08]], [[-0.46, -0.02], [-0.37, -0.02]], [[-0.46, 0.0], [-0.38, 0.04]]];

function rosettes(poly: Vec2[], count: number, spacing: number, r: number, ink: string, accent: string, sw: number): Shape[] {
  const out: Shape[] = [];
  for (const c of phyllotaxis(poly, count, spacing)) {
    const fits = [0, Math.PI / 2, Math.PI, -Math.PI / 2].every((t) => pointInPolygon([c[0] + r * 1.3 * Math.cos(t), c[1] + r * 1.3 * Math.sin(t)], poly));
    if (!fits) continue;
    out.push(circle(c[0], c[1], r, { fill: "none", stroke: ink, strokeWidth: sw }));
    out.push(circle(c[0], c[1], r * 0.35, { fill: accent }));
  }
  return out;
}

export const jaguar = defineMotif({
  id: "jaguar",
  name: "Jaguar caminando",
  tags: ["animal", "transformación", "vigilancia"],
  version: "1.0.0",
  regions: { cabeza: [-0.49, 0.0], tronco: [-0.32, -0.22], punta: [0.32, -0.19], extremidad: [0.4, -0.14] },
  anchors: [
    sharp(-0.5, -0.08), a(-0.45, -0.2), sharp(-0.37, -0.3), a(-0.32, -0.22), a(-0.24, -0.2), a(-0.1, -0.19), a(0.05, -0.17), a(0.2, -0.17),
    a(0.32, -0.19), a(0.42, -0.25), sharp(0.5, -0.42), a(0.46, -0.28), a(0.4, -0.14), a(0.38, 0.0), a(0.39, 0.16), sharp(0.42, 0.3),
    sharp(0.33, 0.3), a(0.31, 0.14), sharp(0.25, 0.04), a(0.2, 0.12), sharp(0.19, 0.3), sharp(0.1, 0.3), a(0.09, 0.12), a(0.0, 0.05),
    a(-0.1, 0.06), a(-0.14, 0.14), sharp(-0.15, 0.3), sharp(-0.23, 0.3), a(-0.23, 0.14), sharp(-0.27, 0.06), a(-0.3, 0.14), sharp(-0.32, 0.3),
    sharp(-0.4, 0.3), a(-0.39, 0.12), a(-0.42, 0.0), a(-0.49, 0.0),
  ],
  features: (fig, p) => {
    const eye = fig.at([-0.43, -0.16]);
    const nose = fig.at([-0.49, -0.09]);
    return [circle(eye[0], eye[1], fig.px(0.02), { fill: p.ink }), circle(nose[0], nose[1], fig.px(0.018), { fill: p.ink })];
  },
  ornaments: (fig, p, rng) => {
    const out: Ornament[] = [];
    if (p.detail >= 2) {
      const count = p.detail === 2 ? 40 : 70;
      const spacing = fig.px(p.detail === 2 ? 0.075 : 0.06);
      const r = fig.px(p.detail === 2 ? 0.032 : 0.027);
      const shapes = rosettes(fig.poly, count, spacing, r, p.ink, p.accent, fig.inkWidth * 0.8);
      out.push({ shapes, params: { rosettes: shapes.length / 2, phyllotaxisSpacing: Number(spacing.toFixed(1)), rosetteRadius: Number(r.toFixed(1)) } });
    }
    if (p.detail >= 3) {
      const dots = stipple(fig.poly, rng, 90, fig.px(0.005), p.ink);
      const whiskers = WHISKERS.map(([q0, q1]) => line(fig.at(q0), fig.at(q1), { stroke: p.ink, strokeWidth: fig.inkWidth * 0.5 }));
      out.push({ shapes: [...dots.shapes, ...whiskers, strokeAt(fig, [[-0.33, -0.28], [-0.35, -0.24]], p.ink)], params: { ...dots.params, whiskers: WHISKERS.length } });
    }
    return out;
  },
  decision: (p) => `felino de perfil caminando a la izquierda, cola alzada; detail ${p.detail}: ${p.detail >= 2 ? "rosetas por filotaxis (ángulo áureo)" : "ojo y nariz"}${p.detail >= 3 ? " + punteado y bigotes" : ""}`,
});
