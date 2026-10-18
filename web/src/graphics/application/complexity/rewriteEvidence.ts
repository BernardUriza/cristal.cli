import { semanticClass, type ComplexityTuning } from "../../config/complexity.ts";
import type { DisplayList, Style } from "../../domain/shapes.ts";
import { flattenLeaves, type Leaf, type RewriteClips } from "./leaves.ts";
import { fillPolygon, makeGrid, type Grid } from "./raster.ts";
import type { RewriteEvidence, RewriteRecordLike } from "./types.ts";

const opaque = (s: Style) => s.fill !== undefined && s.fill !== "none" && s.opacity !== 0;

/** The record a rewrite descends from: the one whose output node holds its source, one level up. */
function parentOf(r: RewriteRecordLike, byOutput: Map<string, RewriteRecordLike>): string | null {
  for (let id = r.sourceNode; ; ) {
    const p = byOutput.get(id);
    if (p && p !== r && p.depth === r.depth - 1) return p.outputNode;
    const cut = id.lastIndexOf("/");
    if (cut < 0) return null;
    id = id.slice(0, cut);
  }
}

type Painted = { leaves: Leaf[]; owner: Int32Array; grid: Grid; clips: RewriteClips; leavesOf: Map<string, number[]>; visible: Map<string, number> };

function painted(list: DisplayList, width: number, height: number, tuning: ComplexityTuning): Painted {
  const clips: RewriteClips = new Map();
  const leaves = flattenLeaves(list, tuning.circleSegments, [], undefined, [], clips).filter((l) => l.closed && l.points.length >= 3 && opaque(l.style));
  const grid = makeGrid(width, height, tuning.silhouetteCellPx);
  const owner = new Int32Array(grid.cols * grid.rows).fill(-1);
  const leavesOf = new Map<string, number[]>();
  leaves.forEach((l, i) => {
    fillPolygon(l.points, grid, (c) => { owner[c] = i; });
    for (const t of l.rewrites ?? []) {
      if (!leavesOf.has(t)) leavesOf.set(t, []);
      leavesOf.get(t)!.push(i);
    }
  });
  const visible = new Map<string, number>();
  for (const o of owner) if (o >= 0) for (const t of leaves[o].rewrites ?? []) visible.set(t, (visible.get(t) ?? 0) + 1);
  return { leaves, owner, grid, clips, leavesOf, visible };
}

type Measured = { projectedPx: number; visibleRatio: number; replacedRatio: number };

function measure(id: string, p: Painted): Measured {
  const own = p.leavesOf.get(id) ?? [];
  if (own.length === 0) return { projectedPx: 0, visibleRatio: 0, replacedRatio: 0 };
  const last = own[own.length - 1];
  const mine = (o: number) => o >= 0 && (p.leaves[o].rewrites?.includes(id) ?? false);
  const stamp = new Set<number>();
  for (const i of own) fillPolygon(p.leaves[i].points, p.grid, (c) => { stamp.add(c); });
  const clip = p.clips.get(id);
  let inMask = 0, filled = 0, hidden = 0;
  if (clip) fillPolygon(clip, p.grid, (c) => { inMask++; const o = p.owner[c]; if (mine(o)) filled++; else if (o > last) hidden++; });
  return { projectedPx: stamp.size * p.grid.cell ** 2, visibleRatio: stamp.size ? (p.visible.get(id) ?? 0) / stamp.size : 0, replacedRatio: clip ? filled / Math.max(1, inMask - hidden) : 0 };
}

/** One piece of evidence per recorded rewrite, measured on the final display list: projected area, what stays visible, and how much of the source's mask the replacement really fills. */
export function rewriteEvidence(list: DisplayList, records: readonly RewriteRecordLike[], width: number, height: number, tuning: ComplexityTuning): RewriteEvidence[] {
  if (records.length === 0) return [];
  const p = painted(list, width, height, tuning);
  const byOutput = new Map<string, RewriteRecordLike>();
  for (const r of records) if (!byOutput.has(r.outputNode)) byOutput.set(r.outputNode, r);
  const cache = new Map<string, Measured>();
  return records.map((r) => {
    const m = cache.get(r.outputNode) ?? measure(r.outputNode, p);
    cache.set(r.outputNode, m);
    const sourceRole = r.sourceRole ?? "", replacementRole = r.replacementRole ?? "";
    return {
      ruleId: r.rule,
      sourceId: r.sourceNode,
      replacementId: r.outputNode,
      sourceRole,
      replacementRole,
      projectedAreaPx: m.projectedPx,
      visibleRatio: m.visibleRatio,
      semanticChanged: sourceRole !== "" && replacementRole !== "" && semanticClass(sourceRole) !== semanticClass(replacementRole),
      relation: r.relation ?? "rewrites",
      parentId: parentOf(r, byOutput),
      replacedRatio: m.replacedRatio,
    };
  });
}
