import type { Rng } from "../../../shared/rng.ts";
import { mapShapePoints, type PointMap } from "../mapPoints.ts";
import { frameOf, matchesPart, quad, type Frame2, type Part, type PartMatch } from "../motifs/figures/parts.ts";
import { group, type Shape, type Vec2 } from "../shapes.ts";

export type Rewrite = {
  id: string;
  match: PartMatch;
  replaceWith: string;
  constraints: { preserveBounds: boolean; preserveAnchors: boolean; maxDepth: number; minProjectedPx: number };
};

export type RewriteRecord = { operation: "rewrite"; rule: string; sourceNode: string; outputNode: string; depth: number; seed: number; reason: string };

export type Ink = { fill: string; ink: string; accent: string; deep: string; line: number; detail: 1 | 2 | 3 };

export type RewriteEnv = { depth: number; seed: number; reason: string; rng: Rng; ink: Ink };

export type LocalSpace = { w: number; h: number; mask?: Vec2[]; pxPerUnit: number };

export type Produced = { part: Part; shapes: Shape[] };

export type Producer = (source: Part, local: LocalSpace, env: RewriteEnv) => Produced;

export type Rule = { rewrite: Rewrite; produce: Producer };

export type Rewritten = { part: Part; shapes: Shape[]; records: RewriteRecord[] };

export type Skip = { skipped: "match" | "maxDepth" | "minProjectedPx" };

export function frameToScreen(f: Frame2): PointMap {
  return ([x, y]) => [f.o[0] + (f.u[0] * x) / f.w + (f.v[0] * y) / f.h, f.o[1] + (f.u[1] * x) / f.w + (f.v[1] * y) / f.h];
}

export function screenToFrame(f: Frame2): PointMap {
  const det = f.u[0] * f.v[1] - f.u[1] * f.v[0] || 1e-9;
  return ([x, y]) => {
    const dx = x - f.o[0];
    const dy = y - f.o[1];
    return [((dx * f.v[1] - dy * f.v[0]) / det) * f.w, ((f.u[0] * dy - f.u[1] * dx) / det) * f.h];
  };
}

export function projectedPx(f: Frame2): number {
  return Math.min(Math.hypot(f.u[0], f.u[1]), Math.hypot(f.v[0], f.v[1]));
}

function mapFrame(f: Frame2, at: PointMap): Frame2 {
  const o = at(f.o);
  const tip = (d: Vec2): Vec2 => {
    const p = at([f.o[0] + d[0], f.o[1] + d[1]]);
    return [p[0] - o[0], p[1] - o[1]];
  };
  return { o, u: tip(f.u), v: tip(f.v), w: f.w, h: f.h };
}

export function mapPart(p: Part, at: PointMap, id: string): Part {
  const anchors: Record<string, Vec2> = {};
  for (const [k, v] of Object.entries(p.anchors)) anchors[k] = at(v);
  return {
    ...p,
    id,
    anchors,
    mask: p.mask?.map(at),
    frame: p.frame ? mapFrame(p.frame, at) : undefined,
    children: p.children.map((c, i) => mapPart(c, at, `${id}/${c.id || i}`)),
  };
}

export function applyRewrite(rule: Rule, source: Part, env: RewriteEnv, rules: readonly Rule[] = [rule]): Rewritten | Skip {
  const { rewrite: rw } = rule;
  if (!matchesPart(source, rw.match)) return { skipped: "match" };
  if (env.depth + 1 > rw.constraints.maxDepth) return { skipped: "maxDepth" };
  const frame = frameOf(source);
  if (projectedPx(frame) < rw.constraints.minProjectedPx) return { skipped: "minProjectedPx" };
  const at = frameToScreen(frame);
  const local: LocalSpace = { w: frame.w, h: frame.h, mask: source.mask?.map(screenToFrame(frame)), pxPerUnit: projectedPx(frame) / Math.min(frame.w, frame.h) };
  const made = rule.produce(source, local, env);
  const out = mapPart(made.part, at, `${source.id}>${rw.replaceWith}`);
  const mask = source.mask ?? (rw.constraints.preserveBounds ? quad(0, 0, frame.w, frame.h).map(at) : undefined);
  const part: Part = { ...out, anchors: rw.constraints.preserveAnchors ? { ...out.anchors, ...source.anchors } : out.anchors, mask, frame };
  const depth = env.depth + 1;
  const record: RewriteRecord = { operation: "rewrite", rule: rw.id, sourceNode: source.id, outputNode: part.id, depth, seed: env.seed, reason: env.reason };
  const nested = rewriteTree(part, rules, { ...env, depth }, false);
  const shapes = [...mapShapePoints(made.shapes, at), ...nested.shapes];
  return { part, shapes: [group([], shapes, mask)], records: [record, ...nested.records] };
}

export type TreeResult = { rootReplaced: boolean; shapes: Shape[]; records: RewriteRecord[] };

export function rewriteTree(root: Part, rules: readonly Rule[], env: RewriteEnv, tryRoot = true): TreeResult {
  if (tryRoot) {
    for (const rule of rules) {
      const r = applyRewrite(rule, root, env, rules);
      if ("part" in r) return { rootReplaced: true, shapes: r.shapes, records: r.records };
    }
  }
  const shapes: Shape[] = [];
  const records: RewriteRecord[] = [];
  for (const child of root.children) {
    const r = rewriteTree(child, rules, env);
    shapes.push(...r.shapes);
    records.push(...r.records);
  }
  return { rootReplaced: false, shapes, records };
}
