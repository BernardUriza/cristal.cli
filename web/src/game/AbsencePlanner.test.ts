import { describe, expect, it } from "vitest";
import { planAbsence } from "./AbsencePlanner";
import type { RelationshipSnapshot } from "./RelationshipTracker";
import type { TransferenceProfile } from "./PersistentTransference";

const relationship: RelationshipSnapshot = {
  trust: 0.2,
  resistance: 0.65,
  curiosity: 0.2,
  avoidance: 0.7,
  ritualDepth: 0.65,
  interactionCount: 40,
  lastStance: "ritualization",
  avoidanceStreak: 5,
};

const profile: TransferenceProfile = {
  dominantDefense: "ritualization",
  confessionRate: 0.1,
  avoidanceRate: 0.75,
  averagePressure: 0.7,
  preferredDepth: 3,
  ritualAffinity: 0.85,
  silenceTolerance: 0.7,
  explorationStyle: "circling",
  confidence: 0.8,
};

describe("planAbsence", () => {
  it("plans explainable omissions without randomness", () => {
    const first = planAbsence({ roomSeed: 123, relationship, profile, sentenceCount: 4 });
    const second = planAbsence({ roomSeed: 123, relationship, profile, sentenceCount: 4 });

    expect(first).toEqual(second);
    expect(first.omissions.length).toBeGreaterThan(0);
    expect(first.omissions.every((item) => item.reason.length > 20)).toBe(true);
  });

  it("omits different kinds according to relationship pressure", () => {
    const plan = planAbsence({ roomSeed: 123, relationship, profile, sentenceCount: 4 });
    const kinds = plan.omissions.map((item) => item.kind);

    expect(kinds).toContain("sentence");
    expect(kinds.some((kind) => kind === "console" || kind === "glyph")).toBe(true);
  });

  it("does not force absence before it is legible", () => {
    const plan = planAbsence({
      roomSeed: 1,
      relationship: { ...relationship, resistance: 0.1, avoidance: 0.1, ritualDepth: 0.1 },
      profile: { ...profile, avoidanceRate: 0.1, ritualAffinity: 0.1, silenceTolerance: 0.1 },
      sentenceCount: 4,
    });

    expect(plan.omissions).toEqual([]);
    expect(plan.explanation).toContain("not made absence legible");
  });
});
