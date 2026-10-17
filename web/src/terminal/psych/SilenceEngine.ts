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

export type SilenceCompanion = "none" | "nag" | "pivot";

export interface SilencePolicy {
  delayMs: number;
  maxLines: number;
  ellipsisOnly: boolean;
  companion: SilenceCompanion;
}

const ELLIPSIS_AT = 4;
const PIVOT_AT = 5;

export function createInitialSilenceState(): SilenceState {
  return { lastStance: null, lastPressure: null, stagnantTurns: 0 };
}

function policyFor(stagnantTurns: number): SilencePolicy {
  if (stagnantTurns >= PIVOT_AT) return { delayMs: 700, maxLines: 1, ellipsisOnly: false, companion: "pivot" };
  if (stagnantTurns >= ELLIPSIS_AT) return { delayMs: 1400, maxLines: 1, ellipsisOnly: true, companion: "nag" };
  if (stagnantTurns === 3) return { delayMs: 1050, maxLines: 1, ellipsisOnly: false, companion: "none" };
  if (stagnantTurns === 2) return { delayMs: 700, maxLines: 1, ellipsisOnly: false, companion: "none" };
  if (stagnantTurns === 1) return { delayMs: 320, maxLines: 2, ellipsisOnly: false, companion: "none" };
  return { delayMs: 0, maxLines: Number.POSITIVE_INFINITY, ellipsisOnly: false, companion: "none" };
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
  const policy = policyFor(stagnantTurns);

  return {
    state: {
      lastStance: event.stance,
      lastPressure: pressure,
      stagnantTurns: policy.companion === "pivot" ? 0 : stagnantTurns,
    },
    policy,
  };
}

export function applySilencePolicy(lines: string[], policy: SilencePolicy, companion?: string): string[] {
  if (policy.companion === "pivot" && companion) return [companion];
  if (policy.ellipsisOnly) return companion ? ["...", companion] : ["..."];
  if (!Number.isFinite(policy.maxLines)) return lines;

  const spoken = lines.filter((line) => line.trim().length > 0).slice(0, policy.maxLines);
  return spoken.length > 0 ? spoken : companion ? ["...", companion] : ["..."];
}
