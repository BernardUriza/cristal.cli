import type { Rng } from "../../../shared/rng.ts";

export type SpaceKind =
  | "complex" | "courtyard" | "hall" | "gallery" | "tower" | "stair" | "chamber" | "bridge"
  | "sanctuary" | "shrine" | "ring-gallery" | "platform"
  | "plaza" | "block" | "building" | "street" | "junction" | "street-ring";

export const SPACE_KINDS: readonly SpaceKind[] = [
  "complex", "courtyard", "hall", "gallery", "tower", "stair", "chamber", "bridge",
  "sanctuary", "shrine", "ring-gallery", "platform", "plaza", "block", "building", "street", "junction", "street-ring",
];

export type Heading = 0 | 90 | 180 | 270;

export type Relation = "connects" | "contains" | "above" | "faces" | "bridges";

export const RELATIONS: readonly Relation[] = ["connects", "contains", "above", "faces", "bridges"];

export type Archetype = "palace" | "city" | "temple" | "labyrinth";

export const ARCHETYPES: readonly Archetype[] = ["palace", "city", "temple", "labyrinth"];

export type SpaceNode = {
  id: string;
  kind: SpaceKind;
  parent?: string;
  level: number;
  footprint: [number, number];
  style: string;
  depth: number;
  height?: number;
  heading?: Heading;
};

export type SpaceEdge = { from: string; to: string; relation: Relation };

export type RuleCall = { rule: string; target: string; params: Record<string, number | string> };

export type TopologyGoal = {
  minBranchNodes?: number;
  minCycles?: number;
  minIndependentBuildings?: number;
  minElevationLevels?: number;
};

export type ArchitectureProgram = { seed: number; archetype: Archetype; rules: RuleCall[]; goal?: TopologyGoal };

export type Expansion = { nodes: SpaceNode[]; edges: SpaceEdge[]; goal?: TopologyGoal };

export type GrammarContext = {
  rng: Rng;
  params: Record<string, number | string>;
  nextId: (kind: SpaceKind) => string;
  budget: number;
  graph?: { readonly nodes: readonly SpaceNode[]; readonly edges: readonly SpaceEdge[] };
};

export type GrammarRule = {
  id: string;
  accepts: readonly SpaceKind[];
  weight: number;
  goal?: TopologyGoal;
  maxDepth: number;
  params: Record<string, { min: number; max: number }>;
  expand: (target: SpaceNode, ctx: GrammarContext) => Expansion;
};

export type AppliedRule = { rule: string; target: string; origin: "program" | "completion"; added: string[] };

export type TopologyMeasure = { branchNodes: number; cycles: number; independentBuildings: number; elevationLevels: number };

export type SpaceGraph = { archetype: Archetype; nodes: SpaceNode[]; edges: SpaceEdge[]; applied: AppliedRule[]; fallbacks: string[]; goal?: TopologyGoal; topology?: TopologyMeasure };

export type GrammarErrorCode =
  | "unknown-archetype"
  | "unknown-rule"
  | "unknown-target"
  | "incompatible-target"
  | "bad-param"
  | "depth-exceeded"
  | "budget-exceeded"
  | "dangling-edge"
  | "containment-cycle"
  | "bad-junction"
  | "topology-goal";

export class GrammarError extends Error {
  readonly code: GrammarErrorCode;

  constructor(code: GrammarErrorCode, message: string) {
    super(`${code}: ${message}`);
    this.code = code;
  }
}
