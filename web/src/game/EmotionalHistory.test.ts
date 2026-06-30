import { describe, expect, it } from "vitest";
import {
  appendEmotionalHistory,
  summarizeEmotionalHistory,
  type EmotionalHistoryEntry,
} from "./EmotionalHistory";

const room = { seed: 1, name: "Room" };

function entry(
  stance: EmotionalHistoryEntry["stance"],
  pressure: number,
  timestamp: number
): EmotionalHistoryEntry {
  return { room, stance, pressure, timestamp };
}

describe("EmotionalHistory", () => {
  it("records bounded, clamped entries", () => {
    const history = appendEmotionalHistory(
      [entry("deflection", 0.2, 1)],
      entry("confession", 3, 2),
      1
    );

    expect(history).toHaveLength(1);
    expect(history[0].stance).toBe("confession");
    expect(history[0].pressure).toBe(1);
  });

  it("summarizes dominant stance and avoidance streak", () => {
    const summary = summarizeEmotionalHistory([
      entry("confession", 0.1, 1),
      entry("deflection", 0.3, 2),
      entry("intellectualization", 0.5, 3),
      entry("deflection", 0.7, 4),
    ]);

    expect(summary.dominantStance).toBe("deflection");
    expect(summary.avoidanceStreak).toBe(3);
    expect(summary.trend).toBe("avoiding");
    expect(summary.summary).toContain("Avoidance");
  });

  it("detects opening through repeated confession", () => {
    const summary = summarizeEmotionalHistory([
      entry("deflection", 0.7, 1),
      entry("confession", 0.4, 2),
      entry("confession", 0.2, 3),
      entry("confession", 0.1, 4),
    ]);

    expect(summary.trend).toBe("opening");
    expect(summary.avoidanceStreak).toBe(0);
  });

  it("answers empty history without guessing", () => {
    const summary = summarizeEmotionalHistory([]);

    expect(summary.dominantStance).toBeNull();
    expect(summary.summary).toContain("No emotional movement");
  });
});
