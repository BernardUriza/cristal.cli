import type { Rng } from "../../../../shared/rng";
import { catmullRomCubics, flattenCubics, polygonBounds, transformPoint, transformPoints, type Anchor, type Placement } from "../../bezier.ts";
import { filled, polygon, polyline, type Shape, type Vec2 } from "../../shapes.ts";
import type { Ornament } from "./ornamentador.ts";
import { boxAnchors, placePart, type PartSpec, type StructuralRole } from "./parts.ts";
import { REGIONS, type RegionAnchors } from "./regions.ts";
import type { MotifDef, MotifParams, MotifTag } from "./types.ts";

export type Figure = {
  place: Placement;
  at: (p: Vec2) => Vec2;
  px: (unit: number) => number;
  inkWidth: number;
  poly: Vec2[];
};

export type FigureSpec = {
  id: string;
  name: string;
  tags: MotifTag[];
  version: string;
  anchors: readonly Anchor[];
  regions: RegionAnchors;
  role?: StructuralRole;
  parts?: PartSpec[];
  tension?: number;
  steps?: number;
  features: (fig: Figure, params: MotifParams) => Shape[];
  ornaments: (fig: Figure, params: MotifParams, rng: Rng) => Ornament[];
  decision: (params: MotifParams) => string;
};

export const a = (x: number, y: number): Anchor => ({ p: [x, y] });
export const sharp = (x: number, y: number): Anchor => ({ p: [x, y], sharp: true });

export function placement(cx: number, cy: number, params: MotifParams): Placement {
  return { cx, cy, size: params.size, rotate: params.rotate ?? 0, mirror: params.mirror ?? false };
}

export function strokeAt(fig: Figure, pts: readonly Vec2[], ink: string, width = fig.inkWidth): Shape {
  return polyline(pts.map(fig.at), { fill: "none", stroke: ink, strokeWidth: width });
}

export function defineMotif(spec: FigureSpec): MotifDef {
  const segments = catmullRomCubics(spec.anchors, spec.tension ?? 0.5);
  const raw = flattenCubics(segments, spec.steps ?? 8);
  const b = polygonBounds(raw);
  const fit = 1 / Math.max(b.maxX - b.minX, b.maxY - b.minY);
  const mid: Vec2 = [(b.minX + b.maxX) / 2, (b.minY + b.maxY) / 2];
  const norm = (p: Vec2): Vec2 => [(p[0] - mid[0]) * fit, (p[1] - mid[1]) * fit];
  const unitPoly = raw.map(norm);
  const figure = (cx: number, cy: number, params: MotifParams): Figure => {
    const place = placement(cx, cy, params);
    return {
      place,
      at: (p) => transformPoint(norm(p), place),
      px: (unit) => unit * params.size * fit,
      inkWidth: Math.max(1, params.size * 0.012),
      poly: transformPoints(params.contour ?? unitPoly, place),
    };
  };
  return {
    id: spec.id,
    name: spec.name,
    tags: spec.tags,
    author: "CRISTAL.CLI (Bézier propio)",
    license: "CC0-1.0",
    version: spec.version,
    algorithm: "bezier_contours",
    role: spec.role ?? "enclosure",
    regions: Object.fromEntries(REGIONS.map((r) => [r, norm(spec.regions[r])])) as RegionAnchors,
    silhouette: (params) => figure(0, 0, params).poly,
    parts: (cx, cy, params) => {
      const fig = figure(cx, cy, params);
      return { id: spec.id, role: spec.role ?? "enclosure", geometryId: spec.id, anchors: boxAnchors(fig.poly), mask: fig.poly, children: (spec.parts ?? []).map((c) => placePart(c, fig.at, spec.id)) };
    },
    draw: (cx, cy, params, rng) => {
      const fig = figure(cx, cy, params);
      const ornaments = spec.ornaments(fig, params, rng);
      const outline = polygon(fig.poly, filled(params.fill, params.ink, fig.inkWidth, { join: "round" }));
      const shapes = [outline, ...(params.features === false ? [] : spec.features(fig, params)), ...ornaments.flatMap((o) => o.shapes)];
      const params_: Record<string, number | string> = { size: params.size, detail: params.detail, anchors: spec.anchors.length };
      for (const o of ornaments) Object.assign(params_, o.params);
      return { shapes, provenance: { algorithm: `bezier_contours@${spec.version}`, params: params_, decision: spec.decision(params) } };
    },
  };
}

export function curve(anchors: readonly Anchor[], steps = 6): Vec2[] {
  return flattenCubics(catmullRomCubics(anchors), steps);
}

export function lens(cx: number, cy: number, w: number, h: number, pointed: boolean): Vec2[] {
  const tip = pointed ? sharp : a;
  return curve([tip(cx - w / 2, cy), a(cx, cy - h / 2), tip(cx + w / 2, cy), a(cx, cy + h / 2)]);
}
