import { mirrorAnchors } from "../../bezier.ts";
import { ellipse, line, polygon, type Shape, type Vec2 } from "../../shapes.ts";
import { a, defineMotif, sharp, strokeAt } from "./define.ts";
import { hatch, type Ornament } from "./ornamentador.ts";
import { oval, quad, type PartSpec } from "./parts.ts";

const SOCKET: Vec2 = [0.17, -0.1];
const TEETH = { x0: -0.19, x1: 0.19, y0: 0.3, y1: 0.43, count: 7 };
const TEMPLE: Vec2[] = [[0.28, -0.32], [0.41, -0.2], [0.4, 0.0], [0.3, -0.04]];

function suture(): Vec2[] {
  const pts: Vec2[] = [];
  for (let i = 0; i <= 12; i++) pts.push([-0.3 + (0.6 * i) / 12, -0.34 + (i % 2) * 0.03]);
  return pts;
}

function teeth(fig: { at: (p: Vec2) => Vec2; inkWidth: number }, ink: string): Shape[] {
  const out: Shape[] = [line(fig.at([TEETH.x0, 0.365]), fig.at([TEETH.x1, 0.365]), { stroke: ink, strokeWidth: fig.inkWidth })];
  out.push(line(fig.at([TEETH.x0 - 0.02, TEETH.y0]), fig.at([TEETH.x1 + 0.02, TEETH.y0]), { stroke: ink, strokeWidth: fig.inkWidth }));
  for (let i = 0; i <= TEETH.count; i++) {
    const x = TEETH.x0 + ((TEETH.x1 - TEETH.x0) * i) / TEETH.count;
    out.push(line(fig.at([x, TEETH.y0]), fig.at([x, TEETH.y1]), { stroke: ink, strokeWidth: fig.inkWidth * 0.8 }));
  }
  return out;
}

export const craneo = defineMotif({
  id: "craneo",
  name: "Cráneo frontal",
  tags: ["muerte", "memoria", "cuerpo"],
  version: "1.0.0",
  role: "crown",
  parts: [
    ...[-1, 1].map((s, i): PartSpec => ({ id: `cuenca${i + 1}`, role: "opening", mask: oval(SOCKET[0] * s, SOCKET[1], 0.11, 0.095) })),
    { id: "boca", role: "opening", mask: quad(TEETH.x0 - 0.02, TEETH.y0, TEETH.x1 + 0.02, TEETH.y1) },
  ],
  anchors: mirrorAnchors([a(0, -0.5), a(0.2, -0.47), a(0.36, -0.36), a(0.43, -0.15), a(0.4, 0.02), a(0.32, 0.1), a(0.3, 0.26), a(0.2, 0.44), sharp(0.08, 0.5), a(0, 0.5)]),
  features: (fig, p) => {
    const shapes: Shape[] = [];
    for (const side of [-1, 1]) {
      const c = fig.at([SOCKET[0] * side, SOCKET[1]]);
      shapes.push(ellipse(c[0], c[1], fig.px(0.11), fig.px(0.095), { fill: p.ink }));
    }
    const nose: Vec2[] = [[0, 0.04], [0.055, 0.21], [0, 0.17], [-0.055, 0.21]];
    shapes.push(polygon(nose.map(fig.at), { fill: p.ink }));
    return [...shapes, ...teeth(fig, p.ink)];
  },
  ornaments: (fig, p) => {
    const out: Ornament[] = [];
    if (p.detail >= 2) {
      const cheeks = [1, -1].map((s) => strokeAt(fig, [[0.4 * s, 0.02], [0.31 * s, 0.08], [0.28 * s, 0.17]], p.ink));
      out.push({ shapes: [strokeAt(fig, suture(), p.ink, fig.inkWidth * 0.8), ...cheeks], params: { sutureTeeth: 12, cheekLines: 2 } });
    }
    if (p.detail >= 3) {
      const shade = [1, -1].flatMap((s) => hatch(TEMPLE.map((q) => fig.at([q[0] * s, q[1]])), fig.px(0.03), 60 * s, { stroke: p.ink, strokeWidth: fig.inkWidth * 0.5, opacity: 0.7 }).shapes);
      const cracks = [[[0.05, -0.47], [0.02, -0.4], [0.06, -0.33]], [[-0.22, -0.2], [-0.26, -0.12]]] as Vec2[][];
      out.push({ shapes: [...shade, ...cracks.map((c) => strokeAt(fig, c, p.ink, fig.inkWidth * 0.7))], params: { hatchSpacing: Number(fig.px(0.03).toFixed(1)), hatchAngle: 60, cracks: cracks.length } });
    }
    return out;
  },
  decision: (p) => `cráneo simétrico (espejo del lado derecho), ${TEETH.count} dientes; detail ${p.detail}: ${p.detail >= 2 ? "sutura y pómulos" : "cuencas, nasal y dientes"}${p.detail >= 3 ? " + sombreado de sienes y grietas" : ""}`,
});
