import type { ComplexityTuning } from "../../config/complexity.ts";
import type { SemanticKind } from "../../domain/semantic.ts";
import type { DisplayList, Vec2 } from "../../domain/shapes.ts";
import { convexHull } from "./descriptor.ts";
import { fillPolygon, type Grid } from "./raster.ts";
import { paint } from "./silhouettes.ts";
import type { CoverageReport, CreatureCoverage, RegionEvidence, SiteEvidence } from "./types.ts";

export class SiteError extends Error {}

const DECLARERS: readonly SiteEvidence["declaredBy"][] = ["program", "patio"];

/** The site must come from the program or patio as a prism in metres; a hull drawn around the scored objects is refused. */
export function siteHull(site: SiteEvidence): Vec2[] {
  if (!DECLARERS.includes(site.declaredBy)) throw new SiteError(`site declared by «${String(site.declaredBy)}»: only the program or the patio declares a site`);
  const f = site.footprintM;
  if (!f || !(f.x1 > f.x0 && f.z1 > f.z0 && f.y1 >= f.y0)) throw new SiteError("site without a footprint in metres");
  if (site.corners.length !== 8) throw new SiteError(`site with ${site.corners.length} corners: a declared prism has 8`);
  return convexHull(site.corners);
}

function maskOf(polygons: readonly Vec2[][], grid: Grid): Uint8Array {
  const m = new Uint8Array(grid.cols * grid.rows);
  for (const p of polygons) if (p.length >= 3) fillPolygon(p, grid, (c) => { m[c] = 1; });
  return m;
}

function count(m: Uint8Array, also?: Uint8Array): number {
  let n = 0;
  for (let i = 0; i < m.length; i++) if (m[i] && (!also || also[i])) n++;
  return n;
}

function fill(kind: Uint8Array, hull: Uint8Array | null, cells: number): CoverageReport {
  const h = hull ? count(hull) : 0;
  return {
    siteFill: hull && h ? count(kind, hull) / h : null,
    canvasFill: count(kind) / cells,
    hullEfficiency: hull ? h / cells : null,
  };
}

export type Coverage = { buildings: CoverageReport; creatures: CreatureCoverage };

/** Visible area per kind from the union of rasterized masks at a fixed cell, against the declared site hull and the creatures' narrated regions. */
export function coverage(list: DisplayList, width: number, height: number, site: SiteEvidence | undefined, regions: readonly RegionEvidence[], tuning: ComplexityTuning): Coverage {
  const p = paint(list, width, height, tuning);
  const grid: Grid = { cols: p.cols, rows: p.rows, cell: p.cellPx };
  const of = (kind: SemanticKind) => Uint8Array.from(p.owner, (o) => (o >= 0 && p.roots[o].kind === kind ? 1 : 0));
  const hull = site ? maskOf([siteHull(site)], grid) : null;
  const region = regions.length ? maskOf(regions.flatMap((r) => r.prisms.map((q) => convexHull(q))), grid) : null;
  const creatures = of("creature");
  const r = region ? count(region) : 0;
  return {
    buildings: fill(of("building"), hull, p.owner.length),
    creatures: { ...fill(creatures, hull, p.owner.length), regionFill: region && r ? count(creatures, region) / r : null },
  };
}
