import type { Stance } from "../terminal/psych/StanceClassifier";

export interface EmotionalRoomRef {
  seed: number;
  name: string;
}

export interface EmotionalHistoryEntry {
  room: EmotionalRoomRef;
  stance: Stance;
  pressure: number;
  timestamp: number;
}

export type EmotionalTrend = "opening" | "avoiding" | "pressurizing" | "relieving" | "steady";

export interface EmotionalHistorySummary {
  summary: string;
  trend: EmotionalTrend;
  dominantStance: Stance | null;
  avoidanceStreak: number;
  averagePressure: number;
}

const EVASIVE: Stance[] = [
  "intellectualization",
  "deflection",
  "anesthesia",
  "ritualization",
];

function clamp01(value: number): number {
  return Math.max(0, Math.min(1, Number.isFinite(value) ? value : 0));
}

function isEvasive(stance: Stance): boolean {
  return EVASIVE.includes(stance);
}

export function appendEmotionalHistory(
  history: EmotionalHistoryEntry[],
  entry: EmotionalHistoryEntry,
  limit = 48
): EmotionalHistoryEntry[] {
  const normalized: EmotionalHistoryEntry = {
    ...entry,
    pressure: clamp01(entry.pressure),
  };
  return [...history, normalized].slice(-Math.max(1, limit));
}

export function summarizeEmotionalHistory(
  history: EmotionalHistoryEntry[]
): EmotionalHistorySummary {
  if (history.length === 0) {
    return {
      summary: "No emotional movement recorded.",
      trend: "steady",
      dominantStance: null,
      avoidanceStreak: 0,
      averagePressure: 0,
    };
  }

  const counts = new Map<Stance, number>();
  let pressureTotal = 0;
  for (const entry of history) {
    counts.set(entry.stance, (counts.get(entry.stance) ?? 0) + 1);
    pressureTotal += clamp01(entry.pressure);
  }

  const dominantStance = [...counts.entries()].sort((a, b) => b[1] - a[1])[0]?.[0] ?? null;
  const averagePressure = pressureTotal / history.length;
  const recent = history.slice(-4);
  const first = recent[0];
  const last = recent[recent.length - 1];
  const pressureDelta = last.pressure - first.pressure;
  const confessionCount = recent.filter((entry) => entry.stance === "confession").length;
  const evasionCount = recent.filter((entry) => isEvasive(entry.stance)).length;

  let avoidanceStreak = 0;
  for (let i = history.length - 1; i >= 0; i--) {
    if (!isEvasive(history[i].stance)) break;
    avoidanceStreak++;
  }

  const trend: EmotionalTrend =
    confessionCount >= 2 && pressureDelta <= 0.05
      ? "opening"
      : evasionCount >= 3
      ? "avoiding"
      : pressureDelta > 0.12
      ? "pressurizing"
      : pressureDelta < -0.12
      ? "relieving"
      : "steady";

  const room = last.room.name;
  const summary =
    dominantStance === "confession"
      ? `Mostly confessing; the latest room (${room}) is easier to read.`
      : avoidanceStreak > 0
      ? `Avoidance has continued for ${avoidanceStreak} step${avoidanceStreak === 1 ? "" : "s"}; the latest room (${room}) is carrying it.`
      : `Emotional posture is mixed; the latest room (${room}) is holding steady.`;

  return {
    summary,
    trend,
    dominantStance,
    avoidanceStreak,
    averagePressure,
  };
}
