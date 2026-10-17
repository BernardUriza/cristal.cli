import { indexBelow } from "../../../shared/rng.ts";
import type { MotifDef } from "../motifs/figures/types.ts";
import { quad, type Part } from "../motifs/figures/parts.ts";
import { filled, line, polygon, stroked, type Shape, type Vec2 } from "../shapes.ts";
import type { Ink, Producer } from "./rewrite.ts";

export type FriezeOptions = { period: readonly [number, number]; motifs: readonly MotifDef[] };

function pattern(x0: number, y0: number, s: number, ink: Ink): Shape[] {
  const c: Vec2 = [x0 + s / 2, y0 + s / 2];
  return [polygon([[c[0], y0 + s * 0.12], [x0 + s * 0.88, c[1]], [c[0], y0 + s * 0.88], [x0 + s * 0.12, c[1]]], stroked(ink.ink, ink.line * 0.7))];
}

function miniFacade(x0: number, y0: number, s: number, ink: Ink): Shape[] {
  const body = quad(x0 + s * 0.18, y0 + s * 0.38, x0 + s * 0.82, y0 + s * 0.95);
  const roof: Vec2[] = [[x0 + s * 0.12, y0 + s * 0.4], [x0 + s / 2, y0 + s * 0.08], [x0 + s * 0.88, y0 + s * 0.4]];
  const out: Shape[] = [polygon(body, filled(ink.fill, ink.ink, ink.line * 0.7)), polygon(roof, filled(ink.accent, ink.ink, ink.line * 0.7))];
  for (const [u, v] of [[0.28, 0.48], [0.58, 0.48]]) out.push(polygon(quad(x0 + s * u, y0 + s * v, x0 + s * (u + 0.14), y0 + s * (v + 0.14)), filled(ink.deep, ink.ink, ink.line * 0.4)));
  out.push(polygon(quad(x0 + s * 0.43, y0 + s * 0.72, x0 + s * 0.57, y0 + s * 0.95), filled(ink.deep, ink.ink, ink.line * 0.4)));
  return out;
}

/** T4: a frieze of repeated cells where one cell in every N holds a tiny facade or a tiny creature instead of the pattern. */
export function inhabitedFrieze(opts: FriezeOptions): Producer {
  return (_source, { w, h }, env) => {
    const s = h;
    const n = Math.max(3, Math.floor(w / s));
    const pad = (w - n * s) / 2;
    const period = opts.period[0] + indexBelow(env.rng, opts.period[1] - opts.period[0] + 1);
    const offset = indexBelow(env.rng, period);
    const shapes: Shape[] = [polygon(quad(0, 0, w, h), filled(env.ink.fill, env.ink.ink, env.ink.line * 0.7))];
    const children: Part[] = [];
    for (let i = 0; i < n; i++) {
      const x0 = pad + i * s;
      if (i > 0) shapes.push(line([x0, 0], [x0, h], { stroke: env.ink.ink, strokeWidth: env.ink.line * 0.5 }));
      if (i % period !== offset) {
        shapes.push(...pattern(x0, 0, s, env.ink));
        continue;
      }
      const k = children.length;
      const motif = opts.motifs.length && k % 2 === 1 ? opts.motifs[indexBelow(env.rng, opts.motifs.length)] : undefined;
      if (motif) shapes.push(...motif.draw(x0 + s / 2, s / 2, { size: s * 0.82, detail: 1, fill: env.ink.fill, ink: env.ink.ink, accent: env.ink.accent }, env.rng).shapes);
      else shapes.push(...miniFacade(x0, 0, s, env.ink));
      children.push({ id: `celda${i}`, role: "connector", geometryId: motif ? `mini-${motif.id}` : "mini-fachada", anchors: { center: [x0 + s / 2, s / 2] }, mask: quad(x0, 0, x0 + s, s), children: [] });
    }
    return { part: { id: "friso", role: "connector", geometryId: "friso-habitado", anchors: {}, mask: quad(0, 0, w, h), children }, shapes };
  };
}
