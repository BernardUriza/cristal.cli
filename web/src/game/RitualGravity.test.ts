import { describe, expect, it } from "vitest";
import { resolveRitualGravity } from "./RitualGravity";
import type { TransferenceProfile } from "./PersistentTransference";

const profile: TransferenceProfile = {
  dominantDefense: "ritualization",
  confessionRate: 0.2,
  avoidanceRate: 0.5,
  averagePressure: 0.4,
  preferredDepth: 4,
  ritualAffinity: 0.9,
  silenceTolerance: 0.2,
  explorationStyle: "threshold-seeking",
  confidence: 0.8,
};

describe("resolveRitualGravity", () => {
  it("gives moon-heavy players more reflection bias", () => {
    const gravity = resolveRitualGravity({
      profile,
      observations: [
        { archetype: "moon", intensity: 1 },
        { archetype: "moon", intensity: 0.8 },
        { archetype: "memory", intensity: 0.2 },
      ],
    });

    expect(gravity.reflectionBias).toBeGreaterThan(gravity.thresholdBias);
    expect(gravity.archetypeBias.moon).toBeGreaterThan(gravity.archetypeBias.gate);
  });

  it("gives gate-heavy players more threshold bias", () => {
    const gravity = resolveRitualGravity({
      profile,
      observations: [
        { archetype: "gate", intensity: 1 },
        { archetype: "gate", intensity: 1 },
        { archetype: "vision", intensity: 0.1 },
      ],
    });

    expect(gravity.thresholdBias).toBeGreaterThan(gravity.reflectionBias);
    expect(gravity.archetypeBias.gate).toBeGreaterThan(gravity.archetypeBias.moon);
  });

  it("keeps influence small so repetition is never deterministic", () => {
    const gravity = resolveRitualGravity({
      profile,
      observations: Array.from({ length: 20 }, () => ({ archetype: "moon" as const, intensity: 1 })),
    });

    expect(gravity.maxInfluence).toBeLessThanOrEqual(0.18);
    expect(gravity.archetypeBias.moon).toBeLessThanOrEqual(1.18);
    expect(gravity.archetypeBias.fragment).toBe(1);
  });
});
