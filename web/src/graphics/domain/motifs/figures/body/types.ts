import type { Rng } from "../../../../../shared/rng.ts";
import type { Vec2 } from "../../../shapes.ts";
import type { RegionWeights } from "../../morph/blend.ts";
import type { StructuralRole } from "../parts.ts";

export type Primitive = "capsule" | "rod" | "barrel" | "disc" | "spike" | "pivot";

export type MotifMorph = { label: string; contour: Vec2[]; features: boolean; spec: { with?: string; weights?: RegionWeights; k?: number } };

export type PartKind = { motif: string; morph?: MotifMorph } | { primitive: Primitive };

export type BodyFamily = "biped" | "quadruped" | "serpentine" | "radial" | "chimera";

export const BODY_FAMILIES: readonly BodyFamily[] = ["biped", "quadruped", "serpentine", "radial", "chimera"];

export type BodySlot = "torso" | "head" | "limb" | "hand" | "foot" | "tail" | "eye";

export type PartNode = { id: string; kind: PartKind; role: StructuralRole; scale: number; depth: number };

export type Socket = { name: string; at: Vec2; dir: Vec2; accepts: readonly StructuralRole[] };

export type Recursion = { times: number; scale: number; turn: number; wave?: number; via?: string };

export type PartEdge = {
  from: string;
  socket: string;
  to: string;
  joint: string;
  offset?: Vec2;
  angle?: number;
  mirror?: boolean;
  flip?: boolean;
  behind?: boolean;
  recursion?: Recursion;
  skew?: number;
  side?: "1" | "2";
};

export type HeldPose = { name: string; kind: Primitive; scale: number; angle: number; side: "1" | "2" };

/** Degrees per joint (shoulder, wrist, hip; `*Skew` opens the mirrored pair apart), torso `tilt`, and length factors per segment. */
export type BodyPose = { tilt: number; shoulder: number; armSkew: number; wrist: number; hip: number; legSkew: number; arm: number; leg: number; head: number; held?: HeldPose };

export type BodyFit = "pivot" | "bounds";

export type AppliedBodyRule = { rule: string; target: string; origin: "program" | "completion"; added: string[] };

export type BodyGraph = {
  family: BodyFamily | "seis-ranuras";
  root: string;
  fit: BodyFit;
  nodes: PartNode[];
  edges: PartEdge[];
  applied: AppliedBodyRule[];
  fallbacks: string[];
  tilt?: number;
};

export type BodyProgram = { seed: number; family: BodyFamily; motifs?: Partial<Record<BodySlot, string>>; budget?: number };

export type BodyExpansion = { nodes: PartNode[]; edges: PartEdge[] };

export type BodyContext = { rng: Rng; family: BodyFamily; nextId: (base: string) => string; kind: (slot: BodySlot) => PartKind };

export type BodyProduction = {
  id: string;
  accepts: readonly StructuralRole[];
  weight: number;
  maxDepth: number;
  when?: (target: PartNode) => boolean;
  expand: (target: PartNode, ctx: BodyContext) => BodyExpansion;
};

export type BodyErrorCode =
  | "unknown-family"
  | "bad-param"
  | "unknown-kind"
  | "unknown-node"
  | "unknown-socket"
  | "incompatible-role"
  | "bad-recursion"
  | "depth-exceeded"
  | "budget-exceeded"
  | "shared-child"
  | "cycle"
  | "orphan"
  | "unknown-op"
  | "unknown-grammar"
  | "too-many-ops"
  | "missing-socket"
  | "bad-count"
  | "bad-weight"
  | "bad-k"
  | "unknown-region"
  | "not-a-motif"
  | "blend-conflict"
  | "no-morph-policy";

export class BodyGraphError extends Error {
  readonly code: BodyErrorCode;

  constructor(code: BodyErrorCode, message: string) {
    super(`${code}: ${message}`);
    this.code = code;
  }
}
