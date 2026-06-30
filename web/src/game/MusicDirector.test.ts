import { describe, expect, it } from "vitest";
import { selectTrack } from "./MusicDirector";
import { GameMode } from "./types";

describe("selectTrack", () => {
  it("maps exploration to the explore track", () => {
    expect(
      selectTrack({
        mode: GameMode.Exploration,
        psychologicalPressure: 0.2,
      }),
    ).toBe("explore");
  });

  it("maps console to the terminal track", () => {
    expect(
      selectTrack({
        mode: GameMode.Console,
        psychologicalPressure: 0.4,
      }),
    ).toBe("terminal");
  });

  it("uses pressure above 0.70 over exploration and console", () => {
    expect(
      selectTrack({
        mode: GameMode.Exploration,
        psychologicalPressure: 0.71,
      }),
    ).toBe("pressure");
    expect(
      selectTrack({
        mode: GameMode.Console,
        psychologicalPressure: 0.95,
      }),
    ).toBe("pressure");
  });

  it("does not use pressure at the 0.70 threshold", () => {
    expect(
      selectTrack({
        mode: GameMode.Console,
        psychologicalPressure: 0.7,
      }),
    ).toBe("terminal");
  });

  it("maps the current room mode and future dream mode to dream", () => {
    expect(
      selectTrack({
        mode: GameMode.Room,
        psychologicalPressure: 0.95,
      }),
    ).toBe("dream");
    expect(
      selectTrack({
        mode: "Dream",
        psychologicalPressure: 0.2,
      }),
    ).toBe("dream");
  });

  it("maps pressure ending state to ending", () => {
    expect(
      selectTrack({
        mode: GameMode.Room,
        psychologicalPressure: 1,
        pressureEnding: { active: true },
      }),
    ).toBe("ending");
    expect(
      selectTrack({
        mode: "PressureEnding",
        psychologicalPressure: 0,
      }),
    ).toBe("ending");
  });
});
