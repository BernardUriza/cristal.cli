import type { Stance } from "../terminal/psych/StanceClassifier";
import { isEvasiveStance } from "../terminal/psych/stanceUtils";
import type { EmotionalHistoryEntry } from "./EmotionalHistory";

export type WorldPersonality =
  | "Cowardly"
  | "Curious"
  | "Avoidant"
  | "Open"
  | "Ritualistic";

export interface AdaptiveWorldInput {
  emotionalHistory: EmotionalHistoryEntry[];
  falseDoorCount: number;
  roomDepths: number[];
}

export interface AdaptiveWorldProfile {
  favoriteStance: Stance | null;
  averagePressure: number;
  confessionRatio: number;
  falseDoorRatio: number;
  averageRoomDepth: number;
  personality: WorldPersonality;
}

function average(values: number[]): number {
  if (values.length === 0) return 0;
  return values.reduce((sum, value) => sum + value, 0) / values.length;
}

function favoriteStance(entries: EmotionalHistoryEntry[]): Stance | null {
  const counts = new Map<Stance, number>();
  for (const entry of entries) counts.set(entry.stance, (counts.get(entry.stance) ?? 0) + 1);
  return [...counts.entries()].sort((a, b) => b[1] - a[1])[0]?.[0] ?? null;
}

export function buildAdaptiveWorldProfile(input: AdaptiveWorldInput): AdaptiveWorldProfile {
  const totalEmotional = input.emotionalHistory.length;
  const favorite = favoriteStance(input.emotionalHistory);
  const averagePressure = average(input.emotionalHistory.map((entry) => entry.pressure));
  const confessionRatio =
    totalEmotional === 0
      ? 0
      : input.emotionalHistory.filter((entry) => entry.stance === "confession").length / totalEmotional;
  const traversals = Math.max(1, input.roomDepths.length + input.falseDoorCount);
  const falseDoorRatio = Math.max(0, input.falseDoorCount) / traversals;
  const averageRoomDepth = average(input.roomDepths);

  const personality: WorldPersonality =
    favorite === "ritualization"
      ? "Ritualistic"
      : averagePressure > 0.72 && falseDoorRatio > 0.18
      ? "Cowardly"
      : falseDoorRatio > 0.24 ||
        (favorite !== null && isEvasiveStance(favorite) && averagePressure > 0.42)
      ? "Avoidant"
      : confessionRatio >= 0.5 && averagePressure < 0.5
      ? "Open"
      : "Curious";

  return {
    favoriteStance: favorite,
    averagePressure,
    confessionRatio,
    falseDoorRatio,
    averageRoomDepth,
    personality,
  };
}
