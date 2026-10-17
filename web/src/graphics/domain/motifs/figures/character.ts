import type { DisorderPolicy } from "../disorder.ts";
import type { FlowPolicy } from "./flowField.ts";

export type CharacterPolicy = { disorder: DisorderPolicy; fur: FlowPolicy; furSpacing: number; furStep: number };

export const CHARACTER: CharacterPolicy = {
  disorder: { fraction: 0.02, kinds: ["rotate", "omit", "shift"], maxRotateDeg: 24, maxShiftUnits: 0.45 },
  fur: { noiseCells: 4, turns: 0.4, baseAngle: 75, steps: 7, jitter: 0.9 },
  furSpacing: 0.034,
  furStep: 0.011,
};
