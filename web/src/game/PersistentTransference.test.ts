import { describe, expect, it } from "vitest";
import { createPersistentTransference, type TransferenceStorage } from "./PersistentTransference";
import type { EmotionalHistoryEntry } from "./EmotionalHistory";

function memoryStorage(): TransferenceStorage {
  const values = new Map<string, string>();
  return {
    getItem: (key) => values.get(key) ?? null,
    setItem: (key, value) => values.set(key, value),
    removeItem: (key) => values.delete(key),
  };
}

function entry(
  stance: EmotionalHistoryEntry["stance"],
  pressure: number,
  timestamp: number,
  depth = 1
): EmotionalHistoryEntry {
  return {
    room: { seed: timestamp, name: `Depth ${depth}` },
    stance,
    pressure,
    timestamp,
  };
}

describe("PersistentTransference", () => {
  it("converges across three sessions with recent sessions carrying more weight", () => {
    const api = createPersistentTransference(memoryStorage());

    api.mergeSession({
      emotionalHistory: [
        entry("confession", 0.18, 1, 1),
        entry("confession", 0.22, 2, 2),
        entry("intellectualization", 0.35, 3, 2),
      ],
      roomDepths: [1, 2, 2],
    });
    api.mergeSession({
      emotionalHistory: [
        entry("ritualization", 0.42, 4, 3),
        entry("ritualization", 0.5, 5, 4),
        entry("intellectualization", 0.62, 6, 4),
      ],
      roomDepths: [3, 4, 4],
    });
    const profile = api.mergeSession({
      emotionalHistory: [
        entry("ritualization", 0.48, 7, 5),
        entry("ritualization", 0.56, 8, 5),
        entry("ritualization", 0.6, 9, 6),
      ],
      roomDepths: [5, 5, 6],
    });

    expect(profile.dominantDefense).toBe("ritualization");
    expect(profile.ritualAffinity).toBeGreaterThan(0.5);
    expect(profile.preferredDepth).toBeGreaterThan(3);
    expect(profile.confidence).toBeGreaterThan(0.4);
  });

  it("does not let one session overwrite an established identity", () => {
    const api = createPersistentTransference(memoryStorage());
    for (let i = 0; i < 4; i++) {
      api.mergeSession({
        emotionalHistory: [
          entry("ritualization", 0.44, i * 3 + 1, 4),
          entry("ritualization", 0.5, i * 3 + 2, 4),
          entry("ritualization", 0.58, i * 3 + 3, 5),
        ],
        roomDepths: [4, 4, 5],
      });
    }

    const profile = api.mergeSession({
      emotionalHistory: [
        entry("confession", 0.08, 20, 1),
        entry("confession", 0.1, 21, 1),
      ],
      roomDepths: [1, 1],
    });

    expect(profile.dominantDefense).toBe("ritualization");
    expect(profile.ritualAffinity).toBeGreaterThan(0.45);
    expect(profile.confessionRate).toBeLessThan(0.4);
  });

  it("loads, saves, and resets through injected storage", () => {
    const storage = memoryStorage();
    const api = createPersistentTransference(storage);
    api.save({
      dominantDefense: "deflection",
      confessionRate: 0.1,
      avoidanceRate: 0.8,
      averagePressure: 0.7,
      preferredDepth: 2,
      ritualAffinity: 0.2,
      silenceTolerance: 0.4,
      explorationStyle: "circling",
      confidence: 0.6,
    });

    expect(createPersistentTransference(storage).load().dominantDefense).toBe("deflection");
    api.reset();
    expect(createPersistentTransference(storage).load().confidence).toBe(0);
  });
});
