import type { Stance } from "../terminal/psych/StanceClassifier";
import type { EmotionalHistoryEntry } from "./EmotionalHistory";
import { generateMicroMirrors, type MicroMirrors } from "./MicroMirrorGenerator";
import type { Room } from "./roomApi";
import { resolveSafeExit, type SafeExit } from "./SafeExitResolver";

export interface RoomD1Input {
  room: Room | null;
  psychologicalStance: Stance | null;
  psychologicalPressure: number;
  emotionalHistory: EmotionalHistoryEntry[];
  falseDoorCount: number;
}

export interface RoomD1Results {
  safeExit: SafeExit | null;
  mirrors: MicroMirrors | null;
}

export function deriveRoomD1Results(input: RoomD1Input): RoomD1Results {
  if (!input.room) return { safeExit: null, mirrors: null };

  return {
    safeExit: resolveSafeExit({
      stance: input.psychologicalStance,
      pressure: input.psychologicalPressure,
      room: input.room,
    }),
    mirrors: generateMicroMirrors({
      room: input.room,
      emotionalHistory: input.emotionalHistory,
      falseDoorCount: input.falseDoorCount,
    }),
  };
}
