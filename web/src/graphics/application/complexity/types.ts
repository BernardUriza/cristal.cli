import type { DisplayList } from "../../domain/shapes.ts";

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
};

export type BandCoverage = { band: DetailBand; areaPct: number };

export type ComplexityReport = {
  topology: { signature: string; localSignatures: number } | null;
  semanticDepth: number;
  multiscale: { bands: BandCoverage[]; bandsAboveThreshold: number };
  silhouettes: { candidates: number; families: number };
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
