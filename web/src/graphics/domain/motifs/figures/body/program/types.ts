import type { BodyFamily, BodyGraph } from "../types.ts";

export type ProgramFamily = BodyFamily | "seis-ranuras";

export const SEMANTIC_SOCKETS = ["head", "torso", "tail", "arm", "leg", "limb", "hand", "foot", "eye"] as const;
export type SemanticSocket = (typeof SEMANTIC_SOCKETS)[number];

export const ARRANGEMENTS = ["radial", "chain", "bilateral"] as const;
export type RepeatArrangement = (typeof ARRANGEMENTS)[number];

export const GRAMMARS = ["facade", "tower", "gallery"] as const;
export type ArchGrammar = (typeof GRAMMARS)[number];

export const OPS = ["replace", "graft", "repeat", "architecturalize"] as const;

export type CreatureOp =
  | { op: "replace"; socket: string; motif: string }
  | { op: "graft"; socket: string; family: BodyFamily; part: string }
  | { op: "repeat"; socket: string; count: number; arrangement: RepeatArrangement }
  | { op: "architecturalize"; socket: string; grammar: ArchGrammar };

export type CreatureProgram = { family: ProgramFamily; seed: number; operations: CreatureOp[] };

export const PROGRAM_LIMITS = { operations: 6, countMin: 2, countMax: 8 } as const;

export type OpTrace = { index: number; op: CreatureOp["op"]; socket: string; targets: string[]; added: string[]; removed: string[]; detail: string };

export type CompiledCreature = { program: CreatureProgram; graph: BodyGraph; grammars: Record<string, ArchGrammar>; trace: OpTrace[] };
