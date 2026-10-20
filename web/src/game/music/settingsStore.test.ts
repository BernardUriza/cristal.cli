import { describe, expect, it } from "vitest";
import { getAudioSettings, setMusicMuted, setMusicVolume, subscribeAudioSettings } from "./settingsStore";

describe("audio settings store", () => {
  it("clamps the volume, toggles mute and notifies until unsubscribed", () => {
    let calls = 0;
    const unsubscribe = subscribeAudioSettings(() => calls++);
    setMusicVolume(4);
    expect(getAudioSettings().volume).toBe(1);
    setMusicMuted(true);
    expect(getAudioSettings().muted).toBe(true);
    unsubscribe();
    setMusicMuted(false);
    expect(calls).toBe(2);
    expect(getAudioSettings().muted).toBe(false);
  });
});
