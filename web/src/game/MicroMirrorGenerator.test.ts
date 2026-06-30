import { describe, expect, it } from "vitest";
import { generateMicroMirrors } from "./MicroMirrorGenerator";
import type { EmotionalHistoryEntry } from "./EmotionalHistory";

const room = { seed: 2, name: "Cell", exits: ["a", "b"] };

function entry(
  stance: EmotionalHistoryEntry["stance"],
  timestamp: number
): EmotionalHistoryEntry {
  return { room, stance, pressure: 0.3, timestamp };
}

describe("generateMicroMirrors", () => {
  it("turns repeated intellectualization into clinical labels", () => {
    const mirrors = generateMicroMirrors({
      room,
      emotionalHistory: [
        entry("intellectualization", 1),
        entry("intellectualization", 2),
        entry("intellectualization", 3),
      ],
      falseDoorCount: 0,
    });

    expect(mirrors.doorLabelMode).toBe("clinical");
    expect(mirrors.note).toContain("diagnostic");
  });

  it("softens room names after repeated confession", () => {
    const mirrors = generateMicroMirrors({
      room,
      emotionalHistory: [entry("confession", 1), entry("confession", 2), entry("confession", 3)],
      falseDoorCount: 0,
    });

    expect(mirrors.softenedRoomName).toContain("Cell");
    expect(mirrors.softenedRoomName).not.toBe("Cell");
  });

  it("adds bounded dead corridors after false doors", () => {
    const mirrors = generateMicroMirrors({
      room,
      emotionalHistory: [],
      falseDoorCount: 7,
    });

    expect(mirrors.deadCorridors).toBe(2);
  });

  it("stays quiet when behavior has not repeated", () => {
    const mirrors = generateMicroMirrors({
      room,
      emotionalHistory: [entry("confession", 1), entry("deflection", 2)],
      falseDoorCount: 1,
    });

    expect(mirrors).toMatchObject({
      doorLabelMode: "plain",
      softenedRoomName: null,
      deadCorridors: 0,
      note: null,
    });
  });
});
