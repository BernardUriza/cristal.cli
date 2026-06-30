import { isEvasiveStance } from "../terminal/psych/stanceUtils";
import { summarizeEmotionalHistory, type EmotionalHistoryEntry } from "./EmotionalHistory";
import type { RelationshipSnapshot } from "./RelationshipTracker";
import type { TransferenceProfile } from "./PersistentTransference";

export type EchoSource =
  | "changed-answer"
  | "repeated-room"
  | "silence"
  | "ritual"
  | "relationship"
  | "defense";

export interface EchoFragment {
  text: string;
  source: EchoSource;
  intensity: number;
}

export interface MemoryEchoInput {
  history: EmotionalHistoryEntry[];
  relationship: RelationshipSnapshot;
  profile: TransferenceProfile;
  limit?: number;
}

function repeatedRoomName(history: EmotionalHistoryEntry[]): string | null {
  const counts = new Map<string, number>();
  for (const entry of history) {
    counts.set(entry.room.name, (counts.get(entry.room.name) ?? 0) + 1);
  }
  return [...counts.entries()].filter(([, count]) => count >= 3).sort((a, b) => b[1] - a[1])[0]?.[0] ?? null;
}

function stanceChangedInSameRoom(history: EmotionalHistoryEntry[]): boolean {
  const stancesByRoom = new Map<number, Set<EmotionalHistoryEntry["stance"]>>();
  for (const entry of history) {
    const stances = stancesByRoom.get(entry.room.seed) ?? new Set<EmotionalHistoryEntry["stance"]>();
    stances.add(entry.stance);
    stancesByRoom.set(entry.room.seed, stances);
  }
  return [...stancesByRoom.values()].some((stances) => stances.size >= 2);
}

export function generateMemoryEchoes(input: MemoryEchoInput): EchoFragment[] {
  const { history, relationship, profile } = input;
  if (history.length < 2) return [];

  const summary = summarizeEmotionalHistory(history);
  const echoes: EchoFragment[] = [];
  const repeatedRoom = repeatedRoomName(history);
  const recent = history.slice(-6);
  const recentRitual = recent.filter((entry) => entry.stance === "ritualization").length;
  const recentSilence = recent.filter((entry) => entry.stance === "anesthesia").length;
  const recentEvasion = recent.filter((entry) => isEvasiveStance(entry.stance)).length;

  if (stanceChangedInSameRoom(history)) {
    echoes.push({
      text: "You answered differently before.",
      source: "changed-answer",
      intensity: 0.5,
    });
  }

  if (repeatedRoom) {
    echoes.push({
      text: `You always stop near ${repeatedRoom}.`,
      source: "repeated-room",
      intensity: Math.min(1, history.filter((entry) => entry.room.name === repeatedRoom).length / 5),
    });
  }

  if (recentSilence >= 2 || profile.silenceTolerance > 0.55) {
    echoes.push({
      text: "This room remembers your silence.",
      source: "silence",
      intensity: Math.max(profile.silenceTolerance, recentSilence / 6),
    });
  }

  if (recentRitual >= 2 || profile.ritualAffinity > 0.5) {
    echoes.push({
      text: "The fourth door again.",
      source: "ritual",
      intensity: Math.max(profile.ritualAffinity, recentRitual / 6),
    });
  }

  if (relationship.resistance > 0.55 && relationship.trust < 0.35) {
    echoes.push({
      text: "The labyrinth has learned the shape of your refusal.",
      source: "relationship",
      intensity: relationship.resistance,
    });
  }

  if (summary.avoidanceStreak >= 3 || (profile.dominantDefense && recentEvasion >= 4)) {
    echoes.push({
      text: "Your old shelter is already waiting.",
      source: "defense",
      intensity: Math.max(profile.avoidanceRate, summary.avoidanceStreak / 6),
    });
  }

  return echoes
    .sort((a, b) => b.intensity - a.intensity)
    .slice(0, input.limit ?? 4)
    .map((echo) => ({ ...echo, intensity: Math.max(0, Math.min(1, echo.intensity)) }));
}
