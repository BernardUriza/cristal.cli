import { describe, expect, it } from "vitest";
import manifest from "../../public/audio/manifest.json";
import { MUSIC_TRACKS, TRACK_FILES, TRACK_LOOPS, resolveMusicIntensity, selectTrack } from "./MusicDirector";
import { GameMode } from "./types";
import type { WorldBehavior } from "./WorldBehaviorResolver";

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

describe("resolveMusicIntensity", () => {
  const behavior = (overrides: Partial<WorldBehavior> = {}): WorldBehavior => ({
    lightingBias: 0.5,
    safeExitProbability: 0.5,
    falseDoorProbability: 0.2,
    roomVerbosity: 0.5,
    mirrorIntensity: 0.3,
    silenceProbability: 0.3,
    architectureDrift: 0.3,
    ...overrides,
  });

  it("uses a neutral behavior bias when no world behavior exists", () => {
    expect(
      resolveMusicIntensity({ mode: GameMode.Exploration, psychologicalPressure: 0 }),
    ).toBeCloseTo(0.5 + 0.35 * 0.18);
  });

  it("rises with psychological pressure", () => {
    const calm = resolveMusicIntensity({ mode: GameMode.Exploration, psychologicalPressure: 0.1 });
    const tense = resolveMusicIntensity({ mode: GameMode.Exploration, psychologicalPressure: 0.9 });
    expect(tense).toBeGreaterThan(calm);
  });

  it("rises with hostile world behavior", () => {
    const mild = resolveMusicIntensity({
      mode: GameMode.Exploration,
      psychologicalPressure: 0.5,
      transference: { worldBehavior: behavior({ mirrorIntensity: 0, architectureDrift: 0, lightingBias: 1, silenceProbability: 0 }) },
    });
    const hostile = resolveMusicIntensity({
      mode: GameMode.Exploration,
      psychologicalPressure: 0.5,
      transference: { worldBehavior: behavior({ mirrorIntensity: 1, architectureDrift: 1, lightingBias: 0, silenceProbability: 1 }) },
    });
    expect(hostile).toBeGreaterThan(mild);
  });

  it("stays clamped in 0..1 at the extremes", () => {
    expect(
      resolveMusicIntensity({
        mode: GameMode.Exploration,
        psychologicalPressure: 5,
        transference: { worldBehavior: behavior({ mirrorIntensity: 1, architectureDrift: 1, lightingBias: 0, silenceProbability: 1 }) },
      }),
    ).toBeLessThanOrEqual(1);
    expect(
      resolveMusicIntensity({ mode: GameMode.Exploration, psychologicalPressure: -3 }),
    ).toBeGreaterThanOrEqual(0);
  });
});

describe("audio manifest", () => {
  const tracks = manifest.tracks as Record<string, { file: string; loop: boolean }>;
  const filesOnDisk = Object.keys(import.meta.glob("../../public/audio/*.mp3")).map(
    (path) => path.split("/").pop() ?? path,
  );

  it("declares exactly the tracks MusicDirector knows", () => {
    expect(Object.keys(tracks).sort()).toEqual([...MUSIC_TRACKS].sort());
  });

  it("points every track at the file MusicDirector plays, and the file exists", () => {
    for (const track of MUSIC_TRACKS) {
      const entry = tracks[track];
      expect(entry, `manifest entry for ${track}`).toBeDefined();
      expect(`/audio/${entry.file}`).toBe(TRACK_FILES[track]);
      expect(filesOnDisk, `${entry.file} on disk`).toContain(entry.file);
    }
  });

  it("agrees with MusicDirector on which tracks loop", () => {
    for (const track of MUSIC_TRACKS) {
      expect(tracks[track].loop, `loop flag for ${track}`).toBe(TRACK_LOOPS[track]);
    }
  });
});
