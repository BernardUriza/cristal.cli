import { circle, line, type Shape, type Vec2 } from "../../shapes.ts";
import { a, defineMotif, sharp, strokeAt } from "./define.ts";
import type { Ornament } from "./ornamentador.ts";
import { oval } from "./parts.ts";

const IRIS = 0.19;
const PUPIL = 0.085;

const lidY = (x: number) => -0.26 + 0.28 * (x / 0.5) ** 2;
const lowerLidY = (x: number) => 0.24 - 0.22 * (x / 0.5) ** 2;

function lashes(count: number, lower: boolean): Vec2[][] {
  const out: Vec2[][] = [];
  for (let i = 0; i < count; i++) {
    const x = -0.42 + (0.84 * i) / (count - 1);
    const y = lower ? lowerLidY(x) : lidY(x);
    const len = lower ? 0.05 : 0.1;
    out.push([[x, y], [x * 1.18, y + (lower ? len : -len)]]);
  }
  return out;
}

function rays(count: number): Vec2[][] {
  const out: Vec2[][] = [];
  for (let i = 0; i < count; i++) {
    const ang = (i * 2 * Math.PI) / count;
    const r0 = PUPIL * 1.15, r1 = IRIS * 0.92;
    out.push([[r0 * Math.cos(ang), -0.01 + r0 * Math.sin(ang)], [r1 * Math.cos(ang), -0.01 + r1 * Math.sin(ang)]]);
  }
  return out;
}

export const ojo = defineMotif({
  id: "ojo",
  name: "Ojo abierto",
  tags: ["vigilancia", "sueño", "cuerpo"],
  version: "1.0.0",
  role: "connector",
  parts: [{ id: "pupila", role: "opening", anchors: { center: [0, -0.01] }, mask: oval(0, -0.01, IRIS * 0.95, IRIS * 0.95) }],
  anchors: [sharp(-0.5, 0.02), a(-0.27, -0.19), a(0, -0.26), a(0.27, -0.19), sharp(0.5, 0.02), a(0.27, 0.17), a(0, 0.24), a(-0.27, 0.17)],
  features: (fig, p) => {
    const c = fig.at([0, -0.01]);
    const hl = fig.at([-0.06, -0.08]);
    const shapes: Shape[] = [
      circle(c[0], c[1], fig.px(IRIS), { fill: p.accent, stroke: p.ink, strokeWidth: fig.inkWidth }),
      circle(c[0], c[1], fig.px(PUPIL), { fill: p.fill, stroke: p.ink, strokeWidth: fig.inkWidth * 0.6 }),
      circle(hl[0], hl[1], fig.px(0.03), { fill: p.ink }),
    ];
    return shapes;
  },
  ornaments: (fig, p) => {
    const out: Ornament[] = [];
    if (p.detail >= 2) {
      const upper = lashes(9, false).map((l) => strokeAt(fig, l, p.ink, fig.inkWidth * 1.2));
      out.push({ shapes: upper, params: { lashes: 9 } });
    }
    if (p.detail >= 3) {
      const r = rays(24).map(([q0, q1]) => line(fig.at(q0), fig.at(q1), { stroke: p.ink, strokeWidth: fig.inkWidth * 0.6, opacity: 0.8 }));
      const lower = lashes(7, true).map((l) => strokeAt(fig, l, p.ink, fig.inkWidth * 0.8));
      out.push({ shapes: [...r, ...lower], params: { irisRays: 24, lowerLashes: 7 } });
    }
    return out;
  },
  decision: (p) => `ojo con iris r=${IRIS} y pupila r=${PUPIL}; detail ${p.detail}: ${p.detail >= 2 ? "pestañas radiales" : "solo contorno"}${p.detail >= 3 ? " + rayos del iris" : ""}`,
});
