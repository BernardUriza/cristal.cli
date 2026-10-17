import type { Anchor } from "../../bezier.ts";
import { line, type Shape, type Vec2 } from "../../shapes.ts";
import { defineMotif, sharp, strokeAt, type Figure } from "./define.ts";
import { hatch, type Ornament } from "./ornamentador.ts";
import { quad, type PartSpec } from "./parts.ts";

const STEPS = 7;
const STEP = 1 / STEPS;
const POST_H = 0.26;

function stepped(): Anchor[] {
  const out: Anchor[] = [sharp(-0.5, 0.5)];
  for (let i = 0; i < STEPS; i++) {
    const x = -0.5 + i * STEP;
    const y = 0.5 - (i + 1) * STEP;
    out.push(sharp(x, y), sharp(x + STEP, y));
  }
  out.push(sharp(0.5, 0.5));
  return out;
}

function treadCenter(i: number): Vec2 {
  return [-0.5 + (i + 0.5) * STEP, 0.5 - (i + 1) * STEP];
}

function railing(fig: Figure, ink: string): Shape[] {
  const posts: Shape[] = [];
  const tops: Vec2[] = [];
  for (let i = 0; i < STEPS; i++) {
    const [x, y] = treadCenter(i);
    posts.push(line(fig.at([x, y]), fig.at([x, y - POST_H]), { stroke: ink, strokeWidth: fig.inkWidth * 0.9 }));
    tops.push([x, y - POST_H]);
  }
  const first = tops[0], last = tops[tops.length - 1];
  const rail: Vec2[] = [[first[0] - STEP * 0.5, first[1] + STEP * 0.5], ...tops, [last[0] + STEP * 0.5, last[1]]];
  return [...posts, strokeAt(fig, rail, ink, fig.inkWidth * 1.4)];
}

export const escalera = defineMotif({
  id: "escalera",
  name: "Escalera",
  tags: ["arquitectura", "repetición", "ascenso"],
  version: "1.0.0",
  role: "support",
  parts: Array.from({ length: STEPS }, (_, i): PartSpec => {
    const [x, y] = treadCenter(i);
    return { id: `peldaño${i + 1}`, role: "support", anchors: { left: [x - STEP / 2, y], right: [x + STEP / 2, y], top: [x, y] }, mask: quad(x - STEP / 2, y, x + STEP / 2, y + STEP) };
  }),
  regions: { cabeza: [-0.071, -0.071], tronco: [0.5, -0.5], punta: [0.5, 0.5], extremidad: [-0.5, 0.5] },
  anchors: stepped(),
  features: () => [],
  ornaments: (fig, p) => {
    const out: Ornament[] = [];
    if (p.detail >= 2) out.push({ shapes: railing(fig, p.ink), params: { posts: STEPS, postHeight: POST_H } });
    if (p.detail >= 3) {
      const stringer: Vec2[] = [[-0.5, 0.5], [0.5, -0.5 + STEP], [0.5, 0.5]];
      const nosings = Array.from({ length: STEPS }, (_, i): Shape => {
        const [x, y] = treadCenter(i);
        return line(fig.at([x - STEP * 0.5, y + STEP * 0.18]), fig.at([x + STEP * 0.5, y + STEP * 0.18]), { stroke: p.ink, strokeWidth: fig.inkWidth * 0.6 });
      });
      const shade = hatch(stringer.map(fig.at), fig.px(0.035), -45, { stroke: p.ink, strokeWidth: fig.inkWidth * 0.5, opacity: 0.6 });
      out.push({ shapes: [...nosings, ...shade.shapes], params: { nosings: STEPS, ...shade.params } });
    }
    return out;
  },
  decision: (p) => `escalera de ${STEPS} peldaños iguales (huella = contrahuella = ${STEP.toFixed(3)}); detail ${p.detail}: ${p.detail >= 2 ? "balaustres y pasamanos" : "solo el perfil"}${p.detail >= 3 ? " + narices y zanca sombreada" : ""}`,
});
