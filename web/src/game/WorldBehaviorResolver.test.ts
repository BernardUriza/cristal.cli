import { describe, expect, it } from "vitest";
import { resolveWorldBehavior } from "./WorldBehaviorResolver";
import type { TransferenceProfile } from "./PersistentTransference";
import type { Room } from "./roomApi";

const room: Room = {
  name: "Witness Hall",
  inscription: "",
  description: "",
  exits: ["north"],
  dread: 0.4,
  shape: "chamber",
  seed: 42,
};

const openProfile: TransferenceProfile = {
  dominantDefense: null,
  confessionRate: 0.75,
  avoidanceRate: 0.12,
  averagePressure: 0.2,
  preferredDepth: 4,
  ritualAffinity: 0.1,
  silenceTolerance: 0.08,
  explorationStyle: "deepening",
  confidence: 0.7,
};

const avoidantProfile: TransferenceProfile = {
  dominantDefense: "intellectualization",
  confessionRate: 0.08,
  avoidanceRate: 0.82,
  averagePressure: 0.76,
  preferredDepth: 2,
  ritualAffinity: 0.2,
  silenceTolerance: 0.65,
  explorationStyle: "circling",
  confidence: 0.8,
};

describe("resolveWorldBehavior", () => {
  it("changes world behavior when the transference profile changes", () => {
    const open = resolveWorldBehavior(openProfile, room, { pressure: 0.2, consecutiveEvasion: 0 });
    const avoidant = resolveWorldBehavior(avoidantProfile, room, {
      pressure: 0.7,
      consecutiveEvasion: 3,
    });

    expect(open.safeExitProbability).toBeGreaterThan(avoidant.safeExitProbability);
    expect(avoidant.falseDoorProbability).toBeGreaterThan(open.falseDoorProbability);
    expect(avoidant.silenceProbability).toBeGreaterThan(open.silenceProbability);
    expect(avoidant.architectureDrift).toBeGreaterThan(open.architectureDrift);
  });

  it("keeps behavior abstract and normalized", () => {
    const behavior = resolveWorldBehavior(avoidantProfile, { ...room, dread: 10 }, 2);
    expect(Object.values(behavior).every((value) => value >= 0 && value <= 1)).toBe(true);
  });
});
