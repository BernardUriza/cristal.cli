import type { SemanticKind } from "../../domain/semantic.ts";
import type { DisplayList, Vec2 } from "../../domain/shapes.ts";
import type { ShapeDescriptor } from "./descriptor.ts";

export type DetailBand = 0 | 1 | 2 | 3;

export type SpaceGraphNode = { id: string; kind: string };

export type SpaceGraphEdge = { from: string; to: string; relation: string };

export type SpaceGraph = { nodes: readonly SpaceGraphNode[]; edges: readonly SpaceGraphEdge[] };

export type StructuralRelation = "contains" | "connects" | "decorates" | "rewrites";

export type RewriteRecordLike = {
  rule: string;
  sourceNode: string;
  outputNode: string;
  sourceRole?: string;
  replacementRole?: string;
  depth: number;
  relation?: StructuralRelation;
};

export type BoxM = { x0: number; x1: number; z0: number; z1: number; y0: number; y1: number };

/** The whole site the program or patio declares (courtyards and voids included), as a prism in metres and its eight projected corners. */
export type SiteEvidence = { declaredBy: "program" | "patio"; footprintM: BoxM; corners: Vec2[] };

/** Where a group of creatures should dominate: the footings its narrated place assigns, each as eight projected prism corners. */
export type RegionEvidence = { group: number; creature: string; place: string; prisms: Vec2[][] };

export type ProvenanceLike = { rewrites?: readonly RewriteRecordLike[]; site?: SiteEvidence; regions?: readonly RegionEvidence[] };

export type SilhouetteUnit = { id: string; semanticRoot: string; kind: SemanticKind; contour: Vec2[]; visibleRatio: number; areaPx: number; descriptor: ShapeDescriptor };

export type SilhouetteReport = { units: number; eligibleUnits: number; distinctClusters: number; effectiveDiversity: number; monolithic: boolean };

export type CoverageReport = { siteFill: number | null; canvasFill: number; hullEfficiency: number | null };

export type CreatureCoverage = CoverageReport & { regionFill: number | null };

export type RewriteEvidence = {
  ruleId: string;
  sourceId: string;
  replacementId: string;
  sourceRole: string;
  replacementRole: string;
  projectedAreaPx: number;
  visibleRatio: number;
  semanticChanged: boolean;
  relation: StructuralRelation;
  parentId: string | null;
  replacedRatio: number;
};

export type RewriteComplexity = { maxVerifiedDepth: number; visibleChainsDepth3: number; verified: number; recorded: number };

export type BandCoverage = { band: DetailBand; areaPct: number };

export type ComplexityReport = {
  topology: { signature: string; localSignatures: number } | null;
  rewrites: RewriteComplexity;
  multiscale: { bands: BandCoverage[]; bandsAboveThreshold: number };
  silhouettes: { buildings: SilhouetteReport; creatures: SilhouetteReport };
  coverage: { buildings: CoverageReport; creatures: CreatureCoverage };
  occlusionViolations: number | null;
};

export type ComplexityInput = {
  list: DisplayList;
  width: number;
  height: number;
  graph?: SpaceGraph | null;
  provenance?: readonly ProvenanceLike[];
  occlusionViolations?: number | null;
};
