import type { Stance } from "../terminal/psych/StanceClassifier";
import { isEvasiveStance } from "../terminal/psych/stanceUtils";
import { clamp01 } from "../shared/math";
import {
  buildAdaptiveWorldProfile,
  type AdaptiveWorldProfile,
} from "./AdaptiveWorldProfile";
import type { EmotionalHistoryEntry } from "./EmotionalHistory";

const STORAGE_KEY = "cristal.d2.transference";
const MAX_SESSIONS = 12;
const IDENTITY_INERTIA = 1.2;

export type ExplorationStyle =
  | "unformed"
  | "threshold-seeking"
  | "circling"
  | "deepening"
  | "withholding";

export interface TransferenceProfile {
  dominantDefense: Stance | null;
  confessionRate: number;
  avoidanceRate: number;
  averagePressure: number;
  preferredDepth: number;
  ritualAffinity: number;
  silenceTolerance: number;
  explorationStyle: ExplorationStyle;
  confidence: number;
}

export interface TransferenceSessionInput {
  emotionalHistory: EmotionalHistoryEntry[];
  adaptiveProfile?: AdaptiveWorldProfile;
  falseDoorCount?: number;
  roomDepths?: number[];
  silenceMoments?: number;
  ritualMoments?: number;
}

export interface TransferenceStorage {
  getItem(key: string): string | null;
  setItem(key: string, value: string): void;
  removeItem(key: string): void;
}

interface SessionSummary {
  dominantDefense: Stance | null;
  confessionRate: number;
  avoidanceRate: number;
  averagePressure: number;
  preferredDepth: number;
  ritualAffinity: number;
  silenceTolerance: number;
  eventCount: number;
}

interface PersistedTransference {
  version: 1;
  sessions: SessionSummary[];
  profile: TransferenceProfile;
}

export interface PersistentTransferenceApi {
  load(): TransferenceProfile;
  save(profile: TransferenceProfile): void;
  mergeSession(session: TransferenceSessionInput): TransferenceProfile;
  getTransference(): TransferenceProfile;
  reset(): void;
}

const EMPTY_PROFILE: TransferenceProfile = {
  dominantDefense: null,
  confessionRate: 0,
  avoidanceRate: 0,
  averagePressure: 0,
  preferredDepth: 0,
  ritualAffinity: 0,
  silenceTolerance: 0,
  explorationStyle: "unformed",
  confidence: 0,
};

function browserStorage(): TransferenceStorage | null {
  if (typeof globalThis === "undefined") return null;
  const maybeStorage = (globalThis as { localStorage?: TransferenceStorage }).localStorage;
  return maybeStorage ?? null;
}

function readPersisted(storage: TransferenceStorage | null): PersistedTransference {
  if (!storage) return { version: 1, sessions: [], profile: EMPTY_PROFILE };
  try {
    const raw = storage.getItem(STORAGE_KEY);
    if (!raw) return { version: 1, sessions: [], profile: EMPTY_PROFILE };
    const parsed = JSON.parse(raw) as Partial<PersistedTransference>;
    if (parsed.version !== 1 || !Array.isArray(parsed.sessions) || !parsed.profile) {
      return { version: 1, sessions: [], profile: EMPTY_PROFILE };
    }
    return {
      version: 1,
      sessions: parsed.sessions.slice(-MAX_SESSIONS).map(normalizeSummary),
      profile: normalizeProfile(parsed.profile),
    };
  } catch {
    return { version: 1, sessions: [], profile: EMPTY_PROFILE };
  }
}

function writePersisted(storage: TransferenceStorage | null, persisted: PersistedTransference): void {
  if (!storage) return;
  storage.setItem(STORAGE_KEY, JSON.stringify(persisted));
}

function normalizeProfile(profile: Partial<TransferenceProfile>): TransferenceProfile {
  return {
    dominantDefense: profile.dominantDefense ?? null,
    confessionRate: clamp01(profile.confessionRate ?? 0),
    avoidanceRate: clamp01(profile.avoidanceRate ?? 0),
    averagePressure: clamp01(profile.averagePressure ?? 0),
    preferredDepth: Math.max(0, Number.isFinite(profile.preferredDepth) ? profile.preferredDepth ?? 0 : 0),
    ritualAffinity: clamp01(profile.ritualAffinity ?? 0),
    silenceTolerance: clamp01(profile.silenceTolerance ?? 0),
    explorationStyle: profile.explorationStyle ?? "unformed",
    confidence: clamp01(profile.confidence ?? 0),
  };
}

function normalizeSummary(summary: Partial<SessionSummary>): SessionSummary {
  return {
    dominantDefense: summary.dominantDefense ?? null,
    confessionRate: clamp01(summary.confessionRate ?? 0),
    avoidanceRate: clamp01(summary.avoidanceRate ?? 0),
    averagePressure: clamp01(summary.averagePressure ?? 0),
    preferredDepth: Math.max(0, Number.isFinite(summary.preferredDepth) ? summary.preferredDepth ?? 0 : 0),
    ritualAffinity: clamp01(summary.ritualAffinity ?? 0),
    silenceTolerance: clamp01(summary.silenceTolerance ?? 0),
    eventCount: Math.max(0, Math.round(summary.eventCount ?? 0)),
  };
}

function summarizeSession(input: TransferenceSessionInput): SessionSummary {
  const profile =
    input.adaptiveProfile ??
    buildAdaptiveWorldProfile({
      emotionalHistory: input.emotionalHistory,
      falseDoorCount: input.falseDoorCount ?? 0,
      roomDepths: input.roomDepths ?? [],
    });
  const eventCount = input.emotionalHistory.length;
  const counts = new Map<Stance, number>();
  for (const entry of input.emotionalHistory) {
    if (isEvasiveStance(entry.stance)) {
      counts.set(entry.stance, (counts.get(entry.stance) ?? 0) + 1);
    }
  }
  const dominantDefense = [...counts.entries()].sort((a, b) => b[1] - a[1])[0]?.[0] ?? null;
  const ritualCount =
    input.ritualMoments ??
    input.emotionalHistory.filter((entry) => entry.stance === "ritualization").length;
  const silenceCount =
    input.silenceMoments ??
    input.emotionalHistory.filter((entry) => entry.stance === "anesthesia").length;

  return {
    dominantDefense,
    confessionRate: profile.confessionRatio,
    avoidanceRate:
      eventCount === 0
        ? 0
        : input.emotionalHistory.filter((entry) => isEvasiveStance(entry.stance)).length / eventCount,
    averagePressure: profile.averagePressure,
    preferredDepth: profile.averageRoomDepth,
    ritualAffinity: eventCount === 0 ? 0 : clamp01(ritualCount / eventCount),
    silenceTolerance: eventCount === 0 ? 0 : clamp01(silenceCount / eventCount),
    eventCount,
  };
}

function weightedAverage(sessions: SessionSummary[], key: keyof SessionSummary): number {
  let total = 0;
  let weightTotal = 0;
  sessions.forEach((session, index) => {
    const recency = 1 + index / Math.max(1, sessions.length - 1);
    const density = Math.min(1.5, 0.5 + session.eventCount / 12);
    const weight = recency * density;
    const value = session[key];
    if (typeof value === "number") {
      total += value * weight;
      weightTotal += weight;
    }
  });
  return weightTotal === 0 ? 0 : total / weightTotal;
}

function resolveDominantDefense(sessions: SessionSummary[]): Stance | null {
  const scores = new Map<Stance, number>();
  sessions.forEach((session, index) => {
    if (!session.dominantDefense) return;
    const weight = 1 + index / Math.max(1, sessions.length - 1);
    scores.set(session.dominantDefense, (scores.get(session.dominantDefense) ?? 0) + weight);
  });
  return [...scores.entries()].sort((a, b) => b[1] - a[1])[0]?.[0] ?? null;
}

function resolveExplorationStyle(profile: Omit<TransferenceProfile, "explorationStyle" | "confidence">): ExplorationStyle {
  if (profile.avoidanceRate > 0.64 && profile.preferredDepth < 2.5) return "withholding";
  if (profile.avoidanceRate > 0.56) return "circling";
  if (profile.confessionRate > 0.45 && profile.preferredDepth >= 3) return "deepening";
  if (profile.preferredDepth >= 4 || profile.ritualAffinity > 0.42) return "threshold-seeking";
  return "unformed";
}

function deriveProfile(sessions: SessionSummary[]): TransferenceProfile {
  if (sessions.length === 0) return EMPTY_PROFILE;
  const base = {
    dominantDefense: resolveDominantDefense(sessions),
    confessionRate: clamp01(weightedAverage(sessions, "confessionRate")),
    avoidanceRate: clamp01(weightedAverage(sessions, "avoidanceRate")),
    averagePressure: clamp01(weightedAverage(sessions, "averagePressure")),
    preferredDepth: weightedAverage(sessions, "preferredDepth"),
    ritualAffinity: clamp01(weightedAverage(sessions, "ritualAffinity")),
    silenceTolerance: clamp01(weightedAverage(sessions, "silenceTolerance")),
  };
  const evidence = sessions.reduce((sum, session) => sum + Math.min(10, session.eventCount), 0);
  return {
    ...base,
    explorationStyle: resolveExplorationStyle(base),
    confidence: clamp01(evidence / (evidence + IDENTITY_INERTIA * 10)),
  };
}

export function createPersistentTransference(
  storage: TransferenceStorage | null = browserStorage()
): PersistentTransferenceApi {
  let persisted = readPersisted(storage);

  return {
    load(): TransferenceProfile {
      persisted = readPersisted(storage);
      return persisted.profile;
    },
    save(profile: TransferenceProfile): void {
      persisted = { ...persisted, profile: normalizeProfile(profile) };
      writePersisted(storage, persisted);
    },
    mergeSession(session: TransferenceSessionInput): TransferenceProfile {
      const summary = summarizeSession(session);
      const sessions = [...persisted.sessions, summary].slice(-MAX_SESSIONS);
      const profile = deriveProfile(sessions);
      persisted = { version: 1, sessions, profile };
      writePersisted(storage, persisted);
      return profile;
    },
    getTransference(): TransferenceProfile {
      return persisted.profile;
    },
    reset(): void {
      persisted = { version: 1, sessions: [], profile: EMPTY_PROFILE };
      storage?.removeItem(STORAGE_KEY);
    },
  };
}

const defaultApi = createPersistentTransference();

export function load(): TransferenceProfile {
  return defaultApi.load();
}

export function save(profile: TransferenceProfile): void {
  defaultApi.save(profile);
}

export function mergeSession(profile: TransferenceSessionInput): TransferenceProfile {
  return defaultApi.mergeSession(profile);
}

export function getTransference(): TransferenceProfile {
  return defaultApi.getTransference();
}

export function reset(): void {
  defaultApi.reset();
}
