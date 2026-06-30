import type { Stance } from "./StanceClassifier";
import { clamp01 } from "../../shared/math";

export interface SilenceState {
  lastStance: Stance | null;
  lastPressure: number | null;
  stagnantTurns: number;
}

export interface SilenceEvent {
  stance: Stance;
  pressure: number;
}

export interface SilencePolicy {
  delayMs: number;
  maxLines: number;
  ellipsisOnly: boolean;
}

export function createInitialSilenceState(): SilenceState {
  return { lastStance: null, lastPressure: null, stagnantTurns: 0 };
}

export function advanceSilence(
  state: SilenceState,
  event: SilenceEvent
): { state: SilenceState; policy: SilencePolicy } {
  const pressure = clamp01(event.pressure);
  const moved =
    state.lastStance === null ||
    event.stance !== state.lastStance ||
    state.lastPressure === null ||
    Math.abs(pressure - state.lastPressure) >= 0.12;
  const stagnantTurns = moved ? 0 : state.stagnantTurns + 1;

  const policy: SilencePolicy =
    stagnantTurns >= 4
      ? { delayMs: 1400, maxLines: 1, ellipsisOnly: true }
      : stagnantTurns === 3
      ? { delayMs: 1050, maxLines: 1, ellipsisOnly: false }
      : stagnantTurns === 2
      ? { delayMs: 700, maxLines: 1, ellipsisOnly: false }
      : stagnantTurns === 1
      ? { delayMs: 320, maxLines: 2, ellipsisOnly: false }
      : { delayMs: 0, maxLines: Number.POSITIVE_INFINITY, ellipsisOnly: false };

  return {
    state: {
      lastStance: event.stance,
      lastPressure: pressure,
      stagnantTurns,
    },
    policy,
  };
}

export function applySilencePolicy(lines: string[], policy: SilencePolicy): string[] {
  if (policy.ellipsisOnly) return ["..."];
  if (!Number.isFinite(policy.maxLines)) return lines;

  const spoken = lines.filter((line) => line.trim().length > 0).slice(0, policy.maxLines);
  return spoken.length > 0 ? spoken : ["..."];
}
