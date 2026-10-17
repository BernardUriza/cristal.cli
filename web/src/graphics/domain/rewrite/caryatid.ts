import type { MotifDef } from "../motifs/figures/types.ts";
import { quad, type Part } from "../motifs/figures/parts.ts";
import { filled, polygon, polyline, type Shape, type Vec2 } from "../shapes.ts";
import type { Producer } from "./rewrite.ts";

type Body = { cx: number; head: number; shoulder: number; hip: number; knee: number; ankle: number; w: number; h: number };

function proportions(w: number, h: number): Body {
  const head = Math.min(w * 0.3, h * 0.085);
  return { cx: w / 2, head, shoulder: h * 0.045 + head * 2.1, hip: h * 0.52, knee: h * 0.74, ankle: h * 0.93, w, h };
}

function side(b: Body, s: number): { leg: Vec2[]; foot: Vec2[]; arm: Vec2[] } {
  const x = (k: number) => b.cx + s * b.w * k;
  return {
    leg: [[x(0.02), b.hip], [x(0.27), b.hip], [x(0.2), b.knee], [x(0.17), b.ankle], [x(0.06), b.ankle], [x(0.05), b.knee]],
    foot: [[x(0.04), b.ankle], [x(0.2), b.ankle], [x(0.3), b.h * 0.975], [x(0.02), b.h * 0.975]],
    arm: [[x(0.34), b.shoulder], [x(0.47), b.shoulder * 0.55], [x(0.44), b.h * 0.03], [x(0.32), b.h * 0.03], [x(0.35), b.shoulder * 0.6], [x(0.24), b.shoulder + b.h * 0.02]],
  };
}

/** T1: the pier becomes a figure standing in its place: feet on the base, raised hands and head under the capital, same height and axis. */
export function caryatid(head?: MotifDef): Producer {
  return (_source, { w, h }, env) => {
    const b = proportions(w, h);
    const st = filled(env.ink.fill, env.ink.ink, env.ink.line, { join: "round" });
    const torso: Vec2[] = [[b.cx - w * 0.36, b.shoulder], [b.cx + w * 0.36, b.shoulder], [b.cx + w * 0.22, b.hip * 0.86], [b.cx + w * 0.28, b.hip], [b.cx - w * 0.28, b.hip], [b.cx - w * 0.22, b.hip * 0.86]];
    const L = side(b, -1);
    const R = side(b, 1);
    const shapes: Shape[] = [
      polygon(quad(0, 0, w, h * 0.03), filled(env.ink.accent, env.ink.ink, env.ink.line)),
      polygon(quad(0, h * 0.975, w, h), filled(env.ink.accent, env.ink.ink, env.ink.line)),
      ...[L, R].flatMap((s) => [polygon(s.arm, st), polygon(s.leg, st), polygon(s.foot, st)]),
      polygon(torso, st),
    ];
    if (env.ink.detail >= 2) shapes.push(polyline([[b.cx, b.shoulder + h * 0.03], [b.cx, b.hip * 0.9]], { stroke: env.ink.ink, strokeWidth: env.ink.line * 0.6 }));
    const headAt: Vec2 = [b.cx, h * 0.04 + b.head];
    if (head) shapes.push(...head.draw(headAt[0], headAt[1], { size: b.head * 2.2, detail: 1, fill: env.ink.fill, ink: env.ink.ink, accent: env.ink.accent }, env.rng).shapes);
    else shapes.push(polygon(quad(b.cx - b.head, headAt[1] - b.head, b.cx + b.head, headAt[1] + b.head), st));
    const part: Part = {
      id: "cariatide",
      role: "support",
      geometryId: "cariatide",
      anchors: { base: [b.cx, h], capital: [b.cx, 0] },
      mask: quad(0, 0, w, h),
      children: [
        { id: "pies", role: "support", geometryId: "pies", anchors: {}, mask: [...L.foot, ...R.foot], children: [] },
        { id: "piernas", role: "support", geometryId: "piernas", anchors: {}, mask: [...L.leg, ...R.leg], children: [] },
        { id: "torso", role: "enclosure", geometryId: "torso", anchors: {}, mask: torso, children: [] },
        { id: "brazos", role: "span", geometryId: "brazos", anchors: {}, mask: [...L.arm, ...R.arm], children: [] },
        { id: "cabeza", role: "crown", geometryId: head?.id ?? "cabeza", anchors: { top: [b.cx, h * 0.04] }, children: [] },
      ],
    };
    return { part, shapes };
  };
}
