import { describe, expect, it } from "vitest";
import { generateMemoryEchoes } from "./MemoryEchoEngine";
import type { EmotionalHistoryEntry } from "./EmotionalHistory";
import type { RelationshipSnapshot } from "./RelationshipTracker";
import type { TransferenceProfile } from "./PersistentTransference";

function entry(
  seed: number,
  room: string,
  stance: EmotionalHistoryEntry["stance"],
  timestamp: number
): EmotionalHistoryEntry {
  return { room: { seed, name: room }, stance, pressure: 0.5, timestamp };
}

const relationship: RelationshipSnapshot = {
  trust: 0.2,
  resistance: 0.7,
  curiosity: 0.15,
  avoidance: 0.6,
  ritualDepth: 0.3,
  interactionCount: 20,
  lastStance: "deflection",
  avoidanceStreak: 4,
};

const profile: TransferenceProfile = {
  dominantDefense: "deflection",
  confessionRate: 0.1,
  avoidanceRate: 0.75,
  averagePressure: 0.62,
  preferredDepth: 2,
  ritualAffinity: 0.2,
  silenceTolerance: 0.1,
  explorationStyle: "circling",
  confidence: 0.7,
};

describe("generateMemoryEchoes", () => {
  it("creates compressed echoes from repeated behavior", () => {
    const echoes = generateMemoryEchoes({
      history: [
        entry(1, "Fourth Door", "deflection", 1),
        entry(1, "Fourth Door", "confession", 2),
        entry(2, "Mirror Well", "deflection", 3),
        entry(1, "Fourth Door", "deflection", 4),
        entry(1, "Fourth Door", "deflection", 5),
      ],
      relationship,
      profile,
    });

    expect(echoes.map((echo) => echo.source)).toContain("repeated-room");
    expect(echoes.map((echo) => echo.source)).toContain("changed-answer");
    expect(echoes.some((echo) => echo.text === "You answered differently before.")).toBe(true);
  });

  it("remembers silence and ritual without replaying exact logs", () => {
    const echoes = generateMemoryEchoes({
      history: [
        entry(1, "Quiet Stair", "anesthesia", 1),
        entry(2, "Quiet Stair", "anesthesia", 2),
        entry(3, "Gate", "ritualization", 3),
        entry(4, "Gate", "ritualization", 4),
      ],
      relationship,
      profile: { ...profile, ritualAffinity: 0.6, silenceTolerance: 0.65 },
    });

    expect(echoes.map((echo) => echo.text)).toContain("This room remembers your silence.");
    expect(echoes.map((echo) => echo.text)).toContain("The fourth door again.");
    expect(echoes.every((echo) => !echo.text.includes("Quiet Stair") || echo.source === "repeated-room")).toBe(true);
  });

  it("does not manufacture echoes from too little memory", () => {
    expect(
      generateMemoryEchoes({
        history: [entry(1, "Alone", "confession", 1)],
        relationship,
        profile,
      })
    ).toEqual([]);
  });
});
