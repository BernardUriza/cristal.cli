import { describe, expect, it } from "vitest";
import { IdentityDrift } from "./IdentityDrift";
import type { RelationshipSnapshot } from "./RelationshipTracker";
import type { TransferenceProfile } from "./PersistentTransference";

const relationship: RelationshipSnapshot = {
  trust: 0.85,
  resistance: 0.2,
  curiosity: 0.7,
  avoidance: 0.25,
  ritualDepth: 0.75,
  interactionCount: 80,
  lastStance: "ritualization",
  avoidanceStreak: 0,
};

const profile: TransferenceProfile = {
  dominantDefense: "ritualization",
  confessionRate: 0.45,
  avoidanceRate: 0.5,
  averagePressure: 0.4,
  preferredDepth: 6,
  ritualAffinity: 0.7,
  silenceTolerance: 0.25,
  explorationStyle: "threshold-seeking",
  confidence: 0.95,
};

describe("IdentityDrift", () => {
  it("starts by addressing the player as You", () => {
    expect(new IdentityDrift().currentIdentity()).toBe("You");
  });

  it("changes identity gradually from accumulated relationship evidence", () => {
    const drift = new IdentityDrift();
    const seen = new Set<string>();
    for (let i = 0; i < 12; i++) {
      seen.add(drift.update({ relationship, profile, pressure: 0.5, echoCount: 4 }).identity);
    }

    expect(seen.has("Visitor")).toBe(true);
    expect(seen.has("Witness")).toBe(true);
    expect(drift.currentIdentity()).not.toBe("You");
  });

  it("never jumps more than one identity rung in an update", () => {
    const drift = new IdentityDrift({ identity: "You", depth: 0 });
    const first = drift.update({ relationship, profile, pressure: 1, echoCount: 10 });
    expect(first.identity).toBe("You");

    for (let i = 0; i < 3; i++) drift.update({ relationship, profile, pressure: 1, echoCount: 10 });
    expect(drift.currentIdentity()).toBe("Visitor");
  });
});
