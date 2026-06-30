import { describe, expect, it } from "vitest";
import { resolveEmotionalSeason } from "./EmotionalSeason";
import type { RelationshipSnapshot } from "./RelationshipTracker";
import type { TransferenceProfile } from "./PersistentTransference";

const profile: TransferenceProfile = {
  dominantDefense: null,
  confessionRate: 0.4,
  avoidanceRate: 0.2,
  averagePressure: 0.25,
  preferredDepth: 3,
  ritualAffinity: 0.1,
  silenceTolerance: 0.2,
  explorationStyle: "deepening",
  confidence: 0.7,
};

const relationship: RelationshipSnapshot = {
  trust: 0.65,
  resistance: 0.1,
  curiosity: 0.35,
  avoidance: 0.1,
  ritualDepth: 0.2,
  interactionCount: 30,
  lastStance: "confession",
  avoidanceStreak: 0,
};

describe("resolveEmotionalSeason", () => {
  it("starts dormant when the labyrinth lacks evidence", () => {
    const state = resolveEmotionalSeason({
      relationship: { ...relationship, interactionCount: 0 },
      profile: { ...profile, confidence: 0 },
      pressureHistory: [],
    });
    expect(state.season).toBe("Dormant");
  });

  it("accepts when trust and confession history are high", () => {
    const state = resolveEmotionalSeason({
      relationship,
      profile,
      pressureHistory: [0.1, 0.2, 0.2],
    });
    expect(state.season).toBe("Accepting");
    expect(state.effects.invitation).toBeGreaterThan(state.effects.refusal);
  });

  it("resists under sustained pressure and resistance", () => {
    const state = resolveEmotionalSeason({
      relationship: { ...relationship, trust: 0.18, resistance: 0.7 },
      profile: { ...profile, avoidanceRate: 0.8, confessionRate: 0.05 },
      pressureHistory: [0.8, 0.9, 0.85],
    });
    expect(state.season).toBe("Resisting");
    expect(state.effects.refusal).toBeGreaterThan(state.effects.invitation);
  });
});
