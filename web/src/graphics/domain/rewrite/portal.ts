import { polygonBounds } from "../bezier.ts";
import { mapShapePoints } from "../mapPoints.ts";
import { quad, type Part } from "../motifs/figures/parts.ts";
import { filled, line, polygon, stroked, type Shape, type Vec2 } from "../shapes.ts";
import type { Producer, RewriteEnv } from "./rewrite.ts";

export type MiniScene = { shapes: Shape[]; width: number; height: number };

export type MiniComposer = (seed: number) => MiniScene;

export type PortalOptions = { frames: number; miniPx: number; mini?: MiniComposer };

const lerp = (a: number, b: number, t: number) => a + (b - a) * t;

function corridor(x0: number, y0: number, x1: number, y1: number, frames: number, env: RewriteEnv): { shapes: Shape[]; end: Vec2[] } {
  const vp: Vec2 = [(x0 + x1) / 2, lerp(y0, y1, 0.48)];
  const ring = (t: number): Vec2[] => quad(lerp(x0, vp[0], t), lerp(y0, vp[1], t), lerp(x1, vp[0], t), lerp(y1, vp[1], t));
  const ink = { stroke: env.ink.ink, strokeWidth: env.ink.line * 0.7 };
  const outer = ring(0);
  const rings = Array.from({ length: frames }, (_, k) => ring(0.8 * (1 - Math.pow(0.6, k + 1))));
  const end = rings[rings.length - 1];
  const shapes: Shape[] = [
    polygon(outer, filled(env.ink.fill, env.ink.ink, env.ink.line)),
    polygon([outer[3], outer[2], end[2], end[3]], filled(env.ink.accent, env.ink.ink, env.ink.line * 0.7, { opacity: 0.55 })),
    ...outer.map((p, i) => line(p, end[i], ink)),
    ...rings.map((r) => polygon(r, stroked(env.ink.ink, env.ink.line * 0.6))),
  ];
  for (let k = 0; k + 1 < rings.length; k++) {
    const [a, b] = [rings[k], rings[k + 1]];
    const [top, bottom] = k % 2 === 0 ? [0, 3] : [1, 2];
    const P = (t: number, s: number) => lerp2(lerp2(a[top], b[top], t), lerp2(a[bottom], b[bottom], t), s);
    shapes.push(polygon([P(0.3, 0.38), P(0.7, 0.38), P(0.7, 1), P(0.3, 1)], filled(env.ink.deep, env.ink.ink, env.ink.line * 0.5)));
  }
  shapes.push(polygon(end, filled(env.ink.deep, env.ink.ink, env.ink.line * 0.7)));
  return { shapes, end };
}

function lerp2(p: Vec2, q: Vec2, t: number): Vec2 {
  return [lerp(p[0], q[0], t), lerp(p[1], q[1], t)];
}

function fitted(scene: MiniScene, x0: number, y0: number, x1: number, y1: number): Shape[] {
  const s = Math.max((x1 - x0) / scene.width, (y1 - y0) / scene.height);
  const ox = (x0 + x1) / 2 - (scene.width * s) / 2;
  const oy = (y0 + y1) / 2 - (scene.height * s) / 2;
  return mapShapePoints(scene.shapes, ([x, y]) => [ox + x * s, oy + y * s]);
}

/** T3: an opening becomes a portal clipped by its own contour; inside, a corridor whose far door is again an opening, or a tiny courtyard. */
export function portal(opts: PortalOptions): Producer {
  return (_source, { w, h, mask, pxPerUnit }, env) => {
    const b = polygonBounds(mask ?? quad(0, 0, w, h));
    const px = Math.min(b.maxX - b.minX, b.maxY - b.minY) * pxPerUnit;
    if (opts.mini && env.depth === 0 && px >= opts.miniPx) {
      const shapes = fitted(opts.mini(env.seed + Math.floor(env.rng() * 997)), b.minX, b.minY, b.maxX, b.maxY);
      return { part: { id: "patio-diminuto", role: "enclosure", geometryId: "patio-diminuto", anchors: {}, mask, children: [] }, shapes };
    }
    const c = corridor(b.minX, b.minY, b.maxX, b.maxY, opts.frames, env);
    const end: Part = { id: "fondo", role: "opening", geometryId: "fondo", anchors: {}, mask: c.end, children: [] };
    return { part: { id: "corredor", role: "connector", geometryId: "corredor", anchors: {}, mask, children: [end] }, shapes: c.shapes };
  };
}
