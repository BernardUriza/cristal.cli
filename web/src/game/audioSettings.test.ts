import { describe, expect, it } from "vitest";
import {
  AUDIO_SETTINGS_KEY,
  DEFAULT_AUDIO_SETTINGS,
  MASTER_GAIN_CEILING,
  loadAudioSettings,
  parseAudioSettings,
  resolveMasterGain,
  saveAudioSettings,
  serializeAudioSettings,
} from "./audioSettings";

describe("parseAudioSettings", () => {
  it("returns defaults for null, empty, and malformed input", () => {
    expect(parseAudioSettings(null)).toEqual(DEFAULT_AUDIO_SETTINGS);
    expect(parseAudioSettings("")).toEqual(DEFAULT_AUDIO_SETTINGS);
    expect(parseAudioSettings("not json")).toEqual(DEFAULT_AUDIO_SETTINGS);
    expect(parseAudioSettings("null")).toEqual(DEFAULT_AUDIO_SETTINGS);
    expect(parseAudioSettings("42")).toEqual(DEFAULT_AUDIO_SETTINGS);
  });

  it("reads valid persisted settings", () => {
    expect(parseAudioSettings('{"muted":true,"volume":0.3}')).toEqual({
      muted: true,
      volume: 0.3,
    });
  });

  it("clamps volume into 0..1 and rejects non-finite values", () => {
    expect(parseAudioSettings('{"muted":false,"volume":7}').volume).toBe(1);
    expect(parseAudioSettings('{"muted":false,"volume":-2}').volume).toBe(0);
    expect(parseAudioSettings('{"muted":false,"volume":null}').volume).toBe(
      DEFAULT_AUDIO_SETTINGS.volume,
    );
  });

  it("falls back per field when a field has the wrong type", () => {
    const parsed = parseAudioSettings('{"muted":"yes","volume":0.5}');
    expect(parsed.muted).toBe(DEFAULT_AUDIO_SETTINGS.muted);
    expect(parsed.volume).toBe(0.5);
  });
});

describe("serializeAudioSettings", () => {
  it("round-trips through parse", () => {
    const settings = { muted: true, volume: 0.65 };
    expect(parseAudioSettings(serializeAudioSettings(settings))).toEqual(settings);
  });

  it("clamps volume on write", () => {
    expect(parseAudioSettings(serializeAudioSettings({ muted: false, volume: 3 })).volume).toBe(1);
  });
});

describe("resolveMasterGain", () => {
  it("is zero when muted regardless of volume", () => {
    expect(resolveMasterGain({ muted: true, volume: 1 })).toBe(0);
  });

  it("scales the ceiling by volume", () => {
    expect(resolveMasterGain({ muted: false, volume: 1 })).toBeCloseTo(MASTER_GAIN_CEILING);
    expect(resolveMasterGain({ muted: false, volume: 0.5 })).toBeCloseTo(MASTER_GAIN_CEILING / 2);
    expect(resolveMasterGain({ muted: false, volume: 0 })).toBe(0);
  });

  it("keeps the historical default loudness (0.42) at default volume", () => {
    expect(resolveMasterGain(DEFAULT_AUDIO_SETTINGS)).toBeCloseTo(0.42);
  });
});

describe("load/save with an injected storage", () => {
  function memoryStorage() {
    const map = new Map<string, string>();
    return {
      getItem: (key: string) => map.get(key) ?? null,
      setItem: (key: string, value: string) => void map.set(key, value),
    };
  }

  it("persists and restores settings", () => {
    const storage = memoryStorage();
    saveAudioSettings({ muted: true, volume: 0.25 }, storage);
    expect(loadAudioSettings(storage)).toEqual({ muted: true, volume: 0.25 });
    expect(storage.getItem(AUDIO_SETTINGS_KEY)).not.toBeNull();
  });

  it("returns defaults when storage is unavailable", () => {
    expect(loadAudioSettings(null)).toEqual(DEFAULT_AUDIO_SETTINGS);
  });

  it("returns defaults when storage throws", () => {
    const throwing = {
      getItem: () => {
        throw new Error("denied");
      },
      setItem: () => {
        throw new Error("denied");
      },
    };
    expect(loadAudioSettings(throwing)).toEqual(DEFAULT_AUDIO_SETTINGS);
    expect(() => saveAudioSettings(DEFAULT_AUDIO_SETTINGS, throwing)).not.toThrow();
  });
});
