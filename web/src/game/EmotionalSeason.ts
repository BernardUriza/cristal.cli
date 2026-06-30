import { clamp01 } from "../shared/math";
import type { EmotionalHistoryEntry } from "./EmotionalHistory";
import type { RelationshipSnapshot } from "./RelationshipTracker";
import type { TransferenceProfile } from "./PersistentTransference";

export type EmotionalSeason = "Dormant" | "Listening" | "Observing" | "Resisting" | "Accepting";

export interface EmotionalSeasonEffects {
  patience: number;
  recall: number;
  refusal: number;
  invitation: number;
  compression: number;
}

export interface EmotionalSeasonState {
  season: EmotionalSeason;
  confidence: number;
  effects: EmotionalSeasonEffects;
}

export interface EmotionalSeasonInput {
  relationship: RelationshipSnapshot;
  profile: TransferenceProfile;
  pressureHistory: readonly number[];
  emotionalHistory?: readonly EmotionalHistoryEntry[];
}

function average(values: readonly number[]): number {
  return values.length === 0 ? 0 : values.reduce((sum, value) => sum + clamp01(value), 0) / values.length;
}

export function resolveEmotionalSeason(input: EmotionalSeasonInput): EmotionalSeasonState {
  const pressure = average(input.pressureHistory);
  const recentPressure = average(input.pressureHistory.slice(-5));
  const historySize = input.emotionalHistory?.length ?? input.relationship.interactionCount;
  const trust = input.relationship.trust;
  const resistance = input.relationship.resistance;
  const confidence = clamp01((input.profile.confidence + Math.min(1, historySize / 24)) / 2);

  const season: EmotionalSeason =
    confidence < 0.18
      ? "Dormant"
      : resistance > 0.58 || recentPressure > 0.72
      ? "Resisting"
      : trust > 0.56 && input.profile.confessionRate > 0.35
      ? "Accepting"
      : input.relationship.curiosity > 0.45 || input.profile.ritualAffinity > 0.45
      ? "Observing"
      : "Listening";

  return {
    season,
    confidence,
    effects: {
      patience: clamp01(0.28 + trust * 0.38 + input.profile.silenceTolerance * 0.18 - pressure * 0.18),
      recall: clamp01(0.18 + input.profile.confidence * 0.3 + input.relationship.ritualDepth * 0.22),
      refusal: clamp01(0.08 + resistance * 0.42 + recentPressure * 0.22 - trust * 0.12),
      invitation: clamp01(0.16 + input.profile.confessionRate * 0.34 + trust * 0.22 - resistance * 0.14),
      compression: clamp01(0.12 + pressure * 0.24 + input.profile.avoidanceRate * 0.18 + confidence * 0.16),
    },
  };
}
