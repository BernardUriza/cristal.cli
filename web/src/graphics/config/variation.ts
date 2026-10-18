import type { RepeatArrangement } from "../domain/motifs/figures/body/program/types.ts";

export type MinorOp =
  | { op: "caricature"; socket: string; k: readonly [number, number] }
  | { op: "repeat"; socket: string; count: readonly [number, number]; arrangement: RepeatArrangement };

/** How the members of one group differ: `minorShare` of them take one seeded minor operation, `height` scales each figure, `seedTries` seeds are tried until every declared operation fits. */
export type MemberVariation = { minorShare: number; height: readonly [number, number]; seedTries: number; seedSpace: number; minorOps: readonly MinorOp[] };

export const MEMBER_VARIATION: MemberVariation = {
  minorShare: 0.7,
  height: [0.84, 1],
  seedTries: 8,
  seedSpace: 100000,
  minorOps: [
    { op: "caricature", socket: "head", k: [0.7, 1.45] },
    { op: "caricature", socket: "torso", k: [0.75, 1.4] },
    { op: "repeat", socket: "arm", count: [2, 3], arrangement: "bilateral" },
    { op: "repeat", socket: "tail", count: [2, 3], arrangement: "chain" },
  ],
};
