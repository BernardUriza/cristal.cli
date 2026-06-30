import type { PressureState } from "../terminal/psych/StancePressureTracker";
import { isEvasiveStance } from "../terminal/psych/stanceUtils";
import { clamp01 } from "../shared/math";
import type { Room } from "./roomApi";
import type { TransferenceProfile } from "./PersistentTransference";

export interface WorldBehavior {
  lightingBias: number;
  safeExitProbability: number;
  falseDoorProbability: number;
  roomVerbosity: number;
  mirrorIntensity: number;
  silenceProbability: number;
  architectureDrift: number;
}

export type WorldBehaviorPressure = number | Pick<PressureState, "pressure" | "consecutiveEvasion">;

function pressureValue(pressure: WorldBehaviorPressure): number {
  return clamp01(typeof pressure === "number" ? pressure : pressure.pressure);
}

function evasionStreak(pressure: WorldBehaviorPressure): number {
  return typeof pressure === "number" ? 0 : Math.max(0, pressure.consecutiveEvasion);
}

export function resolveWorldBehavior(
  profile: TransferenceProfile,
  room: Room,
  pressure: WorldBehaviorPressure
): WorldBehavior {
  const p = pressureValue(pressure);
  const dread = clamp01(room.dread);
  const avoidance = clamp01((profile.avoidanceRate + p) / 2);
  const confession = clamp01(profile.confessionRate);
  const ritual = clamp01(profile.ritualAffinity);
  const silence = clamp01(profile.silenceTolerance);
  const depthPull = clamp01(profile.preferredDepth / 6);
  const repeatedDefense =
    profile.dominantDefense && isEvasiveStance(profile.dominantDefense)
      ? clamp01(0.25 + evasionStreak(pressure) / 5)
      : 0;

  return {
    lightingBias: clamp01(0.42 + confession * 0.2 - avoidance * 0.22 + ritual * 0.08 - dread * 0.12),
    safeExitProbability: clamp01(0.18 + confession * 0.28 - avoidance * 0.16 - dread * 0.08),
    falseDoorProbability: clamp01(0.08 + avoidance * 0.24 + repeatedDefense * 0.12 - confession * 0.08),
    roomVerbosity: clamp01(0.44 + confession * 0.2 + ritual * 0.12 - silence * 0.24 - p * 0.08),
    mirrorIntensity: clamp01(0.2 + ritual * 0.28 + avoidance * 0.14 + depthPull * 0.16),
    silenceProbability: clamp01(0.12 + silence * 0.36 + p * 0.16 - confession * 0.12),
    architectureDrift: clamp01(0.16 + avoidance * 0.24 + ritual * 0.18 + depthPull * 0.12 + dread * 0.08),
  };
}
