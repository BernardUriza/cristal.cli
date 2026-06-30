import { clamp01 } from "../shared/math";
import type { TransferenceProfile } from "./PersistentTransference";

export interface WorldConfidenceState {
  specificity: number;
  exploratory: number;
  terminalMode: "asks" | "recognizes" | "states";
}

export function resolveWorldConfidence(profile: TransferenceProfile): WorldConfidenceState {
  const specificity = clamp01(profile.confidence);
  const terminalMode =
    specificity > 0.68 ? "states" : specificity > 0.32 ? "recognizes" : "asks";

  return {
    specificity,
    exploratory: clamp01(1 - specificity),
    terminalMode,
  };
}
