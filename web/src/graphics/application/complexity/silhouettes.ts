import type { ComplexityTuning } from "../../config/complexity.ts";
import type { SemanticKind } from "../../domain/semantic.ts";
import type { DisplayList, Style } from "../../domain/shapes.ts";
import { completeLinkage, effectiveDiversity } from "./cluster.ts";
import { describe, descriptorDistance, envelope, type ShapeDescriptor } from "./descriptor.ts";
import { flattenLeaves, type Leaf } from "./leaves.ts";
import { measureMasks, type MaskShape } from "./masks.ts";
import { fillPolygon, makeGrid } from "./raster.ts";
import type { SilhouetteReport, SilhouetteUnit } from "./types.ts";

const opaque = (s: Style) => s.fill !== undefined && s.fill !== "none" && s.opacity !== 0;

export type Painted = { roots: { id: string; root: string; kind: SemanticKind }[]; owner: Int32Array; projectedPx: number[]; cellPx: number; cols: number; rows: number };

/** Paints every filled piece of a building or creature in list order into one owner grid: the last to cover a cell owns it, as on screen. */
export function paint(list: DisplayList, width: number, height: number, tuning: ComplexityTuning): Painted {
  const grid = makeGrid(width, height, tuning.silhouetteCellPx);
  const leaves = flattenLeaves(list, tuning.circleSegments).filter((l) => l.root && l.closed && l.points.length >= 3 && opaque(l.style));
  const index = new Map<string, number>();
  const roots: Painted["roots"] = [];
  const own: Leaf[][] = [];
  const unitOf = leaves.map((l) => {
    const id = `${l.root!.kind}:${l.root!.root}`;
    if (!index.has(id)) { index.set(id, roots.length); roots.push({ id, ...l.root! }); own.push([]); }
    const u = index.get(id)!;
    own[u].push(l);
    return u;
  });
  const owner = new Int32Array(grid.cols * grid.rows).fill(-1);
  leaves.forEach((l, i) => fillPolygon(l.points, grid, (c) => { owner[c] = unitOf[i]; }));
  const stamp = new Int32Array(owner.length).fill(-1);
  const area = tuning.silhouetteCellPx ** 2;
  const projectedPx = own.map((ls, u) => {
    let n = 0;
    for (const l of ls) fillPolygon(l.points, grid, (c) => { if (stamp[c] !== u) { stamp[c] = u; n++; } });
    return n * area;
  });
  return { roots, owner, projectedPx, cellPx: grid.cell, cols: grid.cols, rows: grid.rows };
}

const gridOf = (p: Painted) => ({ cols: p.cols, rows: p.rows, cell: p.cellPx });

/** One unit per semantic root (building or creature), measured on what stays visible after everything painted later. */
export function silhouetteUnits(list: DisplayList, width: number, height: number, tuning: ComplexityTuning): SilhouetteUnit[] {
  const p = paint(list, width, height, tuning);
  const masks = measureMasks(p.owner, gridOf(p), p.roots.length, (u) => u, tuning.silhouetteBins);
  return p.roots.map((r, u) => ({
    id: r.id,
    semanticRoot: r.root,
    kind: r.kind,
    contour: envelope(masks[u]),
    visibleRatio: p.projectedPx[u] > 0 ? masks[u].areaPx / p.projectedPx[u] : 0,
    areaPx: masks[u].areaPx,
    descriptor: describe(masks[u], tuning.silhouetteHarmonics),
  }));
}

/** The visible union of every unit of one kind: the composition's silhouette, to compare works with each other. */
export function compositionSilhouette(list: DisplayList, width: number, height: number, kind: SemanticKind, tuning: ComplexityTuning): ShapeDescriptor | null {
  const p = paint(list, width, height, tuning);
  const [mask]: MaskShape[] = measureMasks(p.owner, gridOf(p), 1, (u) => (p.roots[u].kind === kind ? 0 : -1), tuning.silhouetteBins);
  return mask.areaPx > 0 ? describe(mask, tuning.silhouetteHarmonics) : null;
}

export const isEligible = (u: SilhouetteUnit, tuning: ComplexityTuning) => u.visibleRatio >= tuning.silhouetteMinVisibleRatio && u.areaPx >= tuning.silhouetteMinAreaPx;

export function clusterShapes(descriptors: readonly ShapeDescriptor[], tuning: ComplexityTuning): number[] {
  return completeLinkage(descriptors.length, (i, j) => descriptorDistance(descriptors[i], descriptors[j], tuning.silhouetteWeights), tuning.silhouetteClusterDistance);
}

export function silhouetteReport(units: readonly SilhouetteUnit[], kind: SemanticKind, tuning: ComplexityTuning): SilhouetteReport {
  const own = units.filter((u) => u.kind === kind);
  const eligible = own.filter((u) => isEligible(u, tuning));
  const labels = clusterShapes(eligible.map((u) => u.descriptor), tuning);
  return {
    units: own.length,
    eligibleUnits: eligible.length,
    distinctClusters: new Set(labels).size,
    effectiveDiversity: effectiveDiversity(labels),
    monolithic: kind === "building" && own.length === 1,
  };
}
