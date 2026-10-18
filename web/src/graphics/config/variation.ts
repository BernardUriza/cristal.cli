import type { RepeatArrangement } from "../domain/motifs/figures/body/program/types.ts";
import type { Primitive } from "../domain/motifs/figures/body/types.ts";

type Range = readonly [number, number];

export type MinorOp =
  | { op: "caricature"; socket: string; k: readonly [number, number] }
  | { op: "repeat"; socket: string; count: readonly [number, number]; arrangement: RepeatArrangement };

/** An object one member may carry in one hand: a primitive at `scale` of the hand, held at `angle` degrees from the vertical of the world. */
export type HeldObject = { name: string; kind: Primitive; scale: Range; angle: Range };

/** Degrees per joint (`*Skew` opens the mirrored pair apart), torso tilt and length factors per segment; `heldShare` of members carry one of `held`. */
export type PoseRanges = { tilt: Range; shoulder: Range; armSkew: Range; wrist: Range; hip: Range; legSkew: Range; arm: Range; leg: Range; head: Range; heldShare: number; held: readonly HeldObject[] };

/** How the members of one group differ: `minorShare` of them take one seeded minor operation, `height` scales each figure, `seedTries` seeds are tried until every declared operation fits, every member takes its own `pose`. */
export type MemberVariation = { minorShare: number; height: Range; seedTries: number; seedSpace: number; minorOps: readonly MinorOp[]; pose: PoseRanges };

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
  pose: {
    tilt: [-14, 14],
    shoulder: [-70, 25],
    armSkew: [-40, 40],
    wrist: [-35, 35],
    hip: [-20, 8],
    legSkew: [-16, 16],
    arm: [0.72, 1.4],
    leg: [0.7, 1.35],
    head: [0.8, 1.3],
    heldShare: 0.5,
    held: [
      { name: "báculo", kind: "rod", scale: [2.6, 3.4], angle: [-12, 12] },
      { name: "farol", kind: "disc", scale: [0.8, 1.1], angle: [0, 0] },
      { name: "antorcha", kind: "spike", scale: [1.3, 1.8], angle: [-15, 15] },
    ],
  },
};
