import { describe, expect, it } from "vitest";
import { buildAdaptiveWorldProfile } from "./AdaptiveWorldProfile";
import type { EmotionalHistoryEntry } from "./EmotionalHistory";

const room = { seed: 1, name: "Room" };

function entry(
  stance: EmotionalHistoryEntry["stance"],
  pressure: number,
  timestamp: number
): EmotionalHistoryEntry {
  return { room, stance, pressure, timestamp };
}

describe("buildAdaptiveWorldProfile", () => {
  it("learns an open profile from low-pressure confession", () => {
    const profile = buildAdaptiveWorldProfile({
      emotionalHistory: [entry("confession", 0.2, 1), entry("confession", 0.1, 2)],
      falseDoorCount: 0,
      roomDepths: [1, 2],
    });

    expect(profile.favoriteStance).toBe("confession");
    expect(profile.confessionRatio).toBe(1);
    expect(profile.personality).toBe("Open");
  });

  it("learns avoidance from repeated false doors and evasive stance", () => {
    const profile = buildAdaptiveWorldProfile({
      emotionalHistory: [
        entry("deflection", 0.5, 1),
        entry("intellectualization", 0.6, 2),
        entry("deflection", 0.7, 3),
      ],
      falseDoorCount: 3,
      roomDepths: [1, 2, 3],
    });

    expect(profile.favoriteStance).toBe("deflection");
    expect(profile.falseDoorRatio).toBeCloseTo(0.5);
    expect(profile.personality).toBe("Avoidant");
  });

  it("learns cowardly only when pressure and false-door ratio are both high", () => {
    const profile = buildAdaptiveWorldProfile({
      emotionalHistory: [entry("anesthesia", 0.9, 1), entry("deflection", 0.8, 2)],
      falseDoorCount: 2,
      roomDepths: [1, 1],
    });

    expect(profile.personality).toBe("Cowardly");
  });

  it("prioritizes ritualistic repetition", () => {
    const profile = buildAdaptiveWorldProfile({
      emotionalHistory: [entry("ritualization", 0.3, 1), entry("ritualization", 0.4, 2)],
      falseDoorCount: 0,
      roomDepths: [3, 4],
    });

    expect(profile.personality).toBe("Ritualistic");
  });
});
