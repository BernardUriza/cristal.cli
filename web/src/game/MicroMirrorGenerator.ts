import type { EmotionalHistoryEntry } from "./EmotionalHistory";
import type { Room } from "./roomApi";

export interface MicroMirrorInput {
  room: Pick<Room, "seed" | "name" | "exits">;
  emotionalHistory: EmotionalHistoryEntry[];
  falseDoorCount: number;
}

export interface MicroMirrors {
  doorLabelMode: "plain" | "clinical";
  softenedRoomName: string | null;
  deadCorridors: number;
  note: string | null;
}

const SOFTENERS = ["Quieter", "Nearer", "Unarmed", "Lower"];

function recentCount(
  history: EmotionalHistoryEntry[],
  stance: EmotionalHistoryEntry["stance"]
): number {
  return history.slice(-8).filter((entry) => entry.stance === stance).length;
}

export function generateMicroMirrors(input: MicroMirrorInput): MicroMirrors {
  const intellectualizations = recentCount(input.emotionalHistory, "intellectualization");
  const confessions = recentCount(input.emotionalHistory, "confession");
  const deadCorridors = Math.min(
    Math.max(0, 4 - input.room.exits.length),
    Math.floor(Math.max(0, input.falseDoorCount) / 2)
  );
  const softener = SOFTENERS[input.room.seed % SOFTENERS.length];

  return {
    doorLabelMode: intellectualizations >= 3 ? "clinical" : "plain",
    softenedRoomName: confessions >= 3 ? `${softener} ${input.room.name}` : null,
    deadCorridors,
    note:
      intellectualizations >= 3
        ? "labels have become diagnostic"
        : confessions >= 3
        ? "the room name has softened"
        : deadCorridors > 0
        ? "unused corridors have appeared"
        : null,
  };
}
