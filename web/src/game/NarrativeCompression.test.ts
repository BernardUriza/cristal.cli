import { describe, expect, it } from "vitest";
import { compressNarrative } from "./NarrativeCompression";
import type { EmotionalHistoryEntry } from "./EmotionalHistory";
import type { RelationshipSnapshot } from "./RelationshipTracker";
import type { TransferenceProfile } from "./PersistentTransference";

function entry(
  seed: number,
  stance: EmotionalHistoryEntry["stance"],
  timestamp: number
): EmotionalHistoryEntry {
  return { room: { seed, name: `Room ${seed}` }, stance, pressure: 0.5, timestamp };
}

const relationship: RelationshipSnapshot = {
  trust: 0.3,
  resistance: 0.6,
  curiosity: 0.2,
  avoidance: 0.5,
  ritualDepth: 0.2,
  interactionCount: 12,
  lastStance: "intellectualization",
  avoidanceStreak: 3,
};

const profile: TransferenceProfile = {
  dominantDefense: "intellectualization",
  confessionRate: 0.2,
  avoidanceRate: 0.7,
  averagePressure: 0.6,
  preferredDepth: 2,
  ritualAffinity: 0.1,
  silenceTolerance: 0.2,
  explorationStyle: "circling",
  confidence: 0.7,
};

describe("compressNarrative", () => {
  it("summarizes many interactions into one reflective paragraph", () => {
    const paragraph = compressNarrative({
      relationship,
      profile,
      history: Array.from({ length: 12 }, (_, index) =>
        entry(index, index === 11 ? "confession" : "intellectualization", index)
      ),
    });

    expect(paragraph).toContain("You spent twelve rooms explaining your pain before touching it");
    expect(paragraph).toContain("before finally describing it");
    expect(paragraph.split("\n")).toHaveLength(1);
  });

  it("names the learned defense without replaying exact logs", () => {
    const paragraph = compressNarrative({
      relationship,
      profile,
      history: [entry(1, "deflection", 1), entry(2, "deflection", 2), entry(3, "deflection", 3)],
    });

    expect(paragraph).toContain("intellectualization as one of your shelters");
    expect(paragraph).not.toContain("Room 1");
    expect(paragraph).not.toContain("0.7");
  });

  it("handles an empty run as absence rather than analytics", () => {
    expect(compressNarrative({ relationship, profile, history: [] })).toContain("left no pattern behind");
  });
});
