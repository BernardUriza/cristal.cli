import type { Rng } from "../../../shared/rng.ts";
import { mapShapePoints, type PointMap } from "../mapPoints.ts";
import { frameOf, matchesPart, quad, type Frame2, type Part, type PartMatch } from "../motifs/figures/parts.ts";
import { tagRewrite } from "../semantic.ts";
import { group, type Shape, type Vec2 } from "../shapes.ts";
import { clipConvex, polygonArea } from "./visibility.ts";

export type Rewrite = {
  id: string;
  match: PartMatch | readonly PartMatch[];
  replaceWith: string;
  constraints: { preserveBounds: boolean; preserveAnchors: boolean; maxDepth: number; minProjectedPx: number };
  semantic?: { from: string; to: string };
};

export type RewriteEvidence = {
  ruleId: string;
  sourceId: string;
  replacementId: string;
  sourceRole: string;
  replacementRole: string;
  projectedAreaPx: number;
  visibleRatio: number;
  semanticChanged: boolean;
};

export type RewriteRecord = {
  operation: "rewrite";
  rule: string;
  sourceNode: string;
  outputNode: string;
  sourceRole: string;
  replacementRole: string;
  depth: number;
  seed: number;
  reason: string;
  region?: string;
  id: string;
  parent?: string;
  projectedPx: number;
  evidence: RewriteEvidence;
};

export type Ink = { fill: string; ink: string; accent: string; deep: string; line: number; detail: 1 | 2 | 3 };

export type RewriteEnv = { depth: number; seed: number; reason: string; rng: Rng; ink: Ink; region?: string; parent?: string; clip?: Vec2[] };

export type LocalSpace = { w: number; h: number; mask?: Vec2[]; pxPerUnit: number };

export type Produced = { part: Part; shapes: Shape[]; childShapes?: Shape[][] };

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

function matches(p: Part, m: Rewrite["match"]): boolean {
  return Array.isArray(m) ? m.some((x) => matchesPart(p, x)) : matchesPart(p, m as PartMatch);
}

function evidenceOf(rw: Rewrite, source: Part, part: Part, mask: Vec2[] | undefined, clip: Vec2[] | undefined): { evidence: RewriteEvidence; visible?: Vec2[] } {
  const visible = mask && clip ? clipConvex(mask, clip) : mask;
  const whole = mask ? polygonArea(mask) : 0;
  const seen = visible && visible.length >= 3 ? polygonArea(visible) : 0;
  const sourceRole = rw.semantic?.from ?? source.role;
  const replacementRole = rw.semantic?.to ?? part.role;
  return {
    visible,
    evidence: { ruleId: rw.id, sourceId: source.id, replacementId: part.id, sourceRole, replacementRole, projectedAreaPx: seen, visibleRatio: whole > 0 ? seen / whole : 0, semanticChanged: sourceRole !== replacementRole },
  };
}

/** The source is never drawn: its replacement is, and each child of the replacement is either drawn by its producer or replaced in turn. */
export function applyRewrite(rule: Rule, source: Part, env: RewriteEnv, rules: readonly Rule[] = [rule]): Rewritten | Skip {
  const { rewrite: rw } = rule;
  if (!matches(source, rw.match)) return { skipped: "match" };
  if (env.depth + 1 > rw.constraints.maxDepth) return { skipped: "maxDepth" };
  const frame = frameOf(source);
  if (projectedPx(frame) < rw.constraints.minProjectedPx) return { skipped: "minProjectedPx" };
  const at = frameToScreen(frame);
  const local: LocalSpace = { w: frame.w, h: frame.h, mask: source.mask?.map(screenToFrame(frame)), pxPerUnit: projectedPx(frame) / Math.min(frame.w, frame.h) };
  const made = rule.produce(source, local, env);
  const out = mapPart(made.part, at, `${source.id}>${rw.replaceWith}`);
  const mask = rw.constraints.preserveBounds ? source.mask ?? quad(0, 0, frame.w, frame.h).map(at) : out.mask ?? source.mask;
  const part: Part = { ...out, anchors: rw.constraints.preserveAnchors ? { ...out.anchors, ...source.anchors } : out.anchors, mask, frame };
  const depth = env.depth + 1;
  const { evidence, visible } = evidenceOf(rw, source, part, mask, env.clip);
  const record: RewriteRecord = {
    operation: "rewrite", rule: rw.id, sourceNode: source.id, outputNode: part.id, sourceRole: source.geometryId, replacementRole: rw.replaceWith, depth, seed: env.seed, reason: env.reason, ...(env.region ? { region: env.region } : {}),
    id: part.id, ...(env.parent ? { parent: env.parent } : {}), projectedPx: projectedPx(frame), evidence,
  };
  const inner: RewriteEnv = { ...env, depth, parent: part.id, clip: visible ?? env.clip };
  const own = made.childShapes?.map((c) => mapShapePoints(c, at));
  const kids = paintChildren(part.children, own, rules, inner);
  return { part, shapes: [tagRewrite(group([], [...mapShapePoints(made.shapes, at), ...kids.shapes], mask), part.id)], records: [record, ...kids.records] };
}

/** Each child is replaced by the first rule that takes it, or drawn with its own shapes; the two never coexist. */
export function paintChildren(children: readonly Part[], own: readonly Shape[][] | undefined, rules: readonly Rule[], env: RewriteEnv): { shapes: Shape[]; records: RewriteRecord[] } {
  const shapes: Shape[] = [];
  const records: RewriteRecord[] = [];
  children.forEach((child, i) => {
    const r = rewriteTree(child, rules, env);
    if (!r.rootReplaced && own?.[i]) shapes.push(...own[i]);
    shapes.push(...r.shapes);
    records.push(...r.records);
  });
  return { shapes, records };
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
