import { GameMode } from "../types";
import type { SymbolicArchetype } from "../../shared/archetype";
import type { Room } from "../roomApi";
import type { resolveFalseDoorConsequences } from "../FalseDoorConsequences";
import { appendEmotionalHistory, type EmotionalHistoryEntry } from "../EmotionalHistory";
import { resolvePressureEnding, type PressureEndingState } from "../PressureEnding";
import type { VerticalSliceState } from "../VerticalSlice";
import { FALSE_DOOR_HISTORY_LIMIT, HISTORY_LIMIT } from "./config";
import type { GameState } from "./types";

type Transference = GameState["transference"];
type FalseDoorConsequence = ReturnType<typeof resolveFalseDoorConsequences>;

export interface RoomEntryRuntime {
  pressureEnding: PressureEndingState | null;
  stability: number;
  transference: Transference;
}

export function pushHistory(history: Room[], room: Room): Room[] {
  const next = [...history.filter((r) => r.seed !== room.seed), room];
  return next.slice(-HISTORY_LIMIT);
}

export function historyOnEntry(s: GameState, room: Room, now: number): EmotionalHistoryEntry[] {
  return s.psychologicalStance
    ? appendEmotionalHistory(s.emotionalHistory, {
        room: { seed: room.seed, name: room.name },
        stance: s.psychologicalStance,
        pressure: s.psychologicalPressure,
        timestamp: now,
      })
    : s.emotionalHistory;
}

export function roomEntryPatch(
  s: GameState,
  room: Room,
  archetype: SymbolicArchetype,
  parentSeed: number | null,
  emotionalHistory: EmotionalHistoryEntry[],
  runtime: RoomEntryRuntime
): Partial<GameState> {
  return {
    room,
    roomArchetype: archetype,
    roomLoading: false,
    roomError: null,
    mode: GameMode.Room,
    parentSeed,
    roomHistory: pushHistory(s.roomHistory, room),
    emotionalHistory,
    ...runtime,
  };
}

export function roomLeavePatch(s: GameState, transference: Transference): Partial<GameState> {
  return {
    room: null,
    roomLoading: false,
    roomError: null,
    roomArchetype: null,
    nearbyExit: null,
    parentSeed: null,
    roomHistory: [],
    stability: 100,
    roomPressureSpike: 0,
    lastRoomWhisper: null,
    pressureEnding: null,
    transference,
    mode: s.mode === GameMode.Room ? GameMode.Exploration : s.mode,
  };
}

export function sessionRoomDepths(s: GameState): number[] {
  return s.roomHistory.map((_, i) => Math.max(0, s.depth - s.roomHistory.length + i + 1));
}

export function withDangerousSeed(seeds: number[], seed: number | undefined): number[] {
  return seed === undefined || seeds.includes(seed) ? seeds : [...seeds, seed];
}

export function falseDoorHistory(
  s: GameState,
  room: Room,
  consequence: FalseDoorConsequence,
  pressure: number,
  now: number
): EmotionalHistoryEntry[] {
  return appendEmotionalHistory(s.emotionalHistory, {
    room: { seed: room.seed, name: room.name },
    stance: consequence.pressureStance,
    pressure,
    timestamp: now,
  });
}

export interface FalseDoorOutcome {
  room: Room;
  consequence: FalseDoorConsequence;
  pressure: number;
  stability: number | null;
  emotionalHistory: EmotionalHistoryEntry[];
  verticalSlice: VerticalSliceState;
  transference: Transference;
  now: number;
}

export function falseDoorPatch(s: GameState, outcome: FalseDoorOutcome): Partial<GameState> {
  const { room, consequence, pressure, now } = outcome;
  return {
    stability: outcome.stability ?? s.stability,
    psychologicalPressure: pressure,
    psychologicalStance: consequence.pressureStance,
    pressureEnding:
      s.pressureEnding ??
      resolvePressureEnding({ pressure, inRoom: s.mode === GameMode.Room && !!s.room, now }),
    roomPressureSpike: Math.max(s.roomPressureSpike, consequence.atmosphereSpike),
    falseDoorAnnotations: [...s.falseDoorAnnotations, { ...consequence.annotation, timestamp: now }].slice(
      -FALSE_DOOR_HISTORY_LIMIT
    ),
    emotionalHistory: outcome.emotionalHistory,
    lastRoomWhisper: consequence.whisper,
    verticalSlice: outcome.verticalSlice,
    dangerousSeeds: withDangerousSeed(s.dangerousSeeds, room.seed),
    transference: outcome.transference,
  };
}
