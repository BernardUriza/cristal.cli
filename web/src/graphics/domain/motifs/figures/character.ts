import type { DisorderPolicy } from "../disorder.ts";
import type { FlowPolicy } from "./flowField.ts";

/** Spacing and step are in motif units (the silhouette spans 1); width is a fraction of the ink stroke. */
export type FlowTexture = { flow: FlowPolicy; spacing: number; step: number; width: number; opacity: number };

export type CharacterPolicy = {
  disorder: DisorderPolicy;
  fur: FlowPolicy;
  furSpacing: number;
  furStep: number;
  pelt: FlowTexture & { clearance: number };
  hair: FlowTexture;
  skin: FlowTexture;
};

export const CHARACTER: CharacterPolicy = {
  disorder: { fraction: 0.02, kinds: ["rotate", "omit", "shift"], maxRotateDeg: 24, maxShiftUnits: 0.45 },
  fur: { noiseCells: 4, turns: 0.4, baseAngle: 75, steps: 7, jitter: 0.9 },
  furSpacing: 0.034,
  furStep: 0.011,
  pelt: { flow: { noiseCells: 3, turns: 0.18, baseAngle: 12, steps: 5, jitter: 0.8 }, spacing: 0.042, step: 0.011, width: 0.35, opacity: 0.45, clearance: 1.35 },
  hair: { flow: { noiseCells: 3, turns: 0.12, baseAngle: 105, steps: 9, jitter: 0.6 }, spacing: 0.026, step: 0.014, width: 0.45, opacity: 0.7 },
  skin: { flow: { noiseCells: 4, turns: 0.22, baseAngle: 8, steps: 4, jitter: 1 }, spacing: 0.06, step: 0.01, width: 0.3, opacity: 0.35 },
};
