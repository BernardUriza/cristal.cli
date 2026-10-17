import type { SemanticKind } from "../../domain/semantic.ts";
import type { DisplayList, Vec2 } from "../../domain/shapes.ts";
import type { ShapeDescriptor } from "./descriptor.ts";

export type DetailBand = 0 | 1 | 2 | 3;

export type SpaceGraphNode = { id: string; kind: string };

export type SpaceGraphEdge = { from: string; to: string; relation: string };

export type SpaceGraph = { nodes: readonly SpaceGraphNode[]; edges: readonly SpaceGraphEdge[] };

export type RewriteEntry = {
  operation?: string;
  depth?: number | string;
  id?: string;
  parent?: string;
  params?: Record<string, number | string>;
  rewrites?: readonly RewriteEntry[];
};

export type SilhouetteUnit = { id: string; semanticRoot: string; kind: SemanticKind; contour: Vec2[]; visibleRatio: number; areaPx: number; descriptor: ShapeDescriptor };

export type SilhouetteReport = { units: number; eligibleUnits: number; distinctClusters: number; effectiveDiversity: number; visibleAreaCoverage: number; monolithic: boolean };

export type BandCoverage = { band: DetailBand; areaPct: number };

export type ComplexityReport = {
  topology: { signature: string; localSignatures: number } | null;
  semanticDepth: number;
  multiscale: { bands: BandCoverage[]; bandsAboveThreshold: number };
  silhouettes: { buildings: SilhouetteReport; creatures: SilhouetteReport };
  occlusionViolations: number | null;
};

export type ComplexityInput = {
  list: DisplayList;
  width: number;
  height: number;
  graph?: SpaceGraph | null;
  provenance?: readonly RewriteEntry[];
  occlusionViolations?: number | null;
};
