import type { Rng } from "../../../../shared/rng";
import type { Shape, Vec2 } from "../../shapes.ts";
import type { Part, StructuralRole } from "./parts.ts";
import type { RegionAnchors } from "./regions.ts";

export type MotifTag =
  | "arquitectura"
  | "repetición"
  | "vigilancia"
  | "sueño"
  | "transformación"
  | "memoria"
  | "cuerpo"
  | "animal"
  | "muerte"
  | "ascenso";

export type MotifParams = {
  size: number;
  rotate?: number;
  mirror?: boolean;
  detail: 1 | 2 | 3;
  lodPx?: readonly number[];
  fill: string;
  ink: string;
  accent: string;
  contour?: readonly Vec2[];
  features?: boolean;
};

export type Provenance = {
  algorithm: string;
  params: Record<string, number | string>;
  decision: string;
};

export type MotifDrawing = { shapes: Shape[]; provenance: Provenance };

export type MotifDef = {
  id: string;
  name: string;
  tags: MotifTag[];
  author: "CRISTAL.CLI (Bézier propio)";
  license: "CC0-1.0";
  version: string;
  algorithm: "bezier_contours";
  role: StructuralRole;
  regions: RegionAnchors;
  silhouette: (params: MotifParams) => Vec2[];
  parts: (cx: number, cy: number, params: MotifParams) => Part;
  draw: (cx: number, cy: number, params: MotifParams, rng: Rng) => MotifDrawing;
};
