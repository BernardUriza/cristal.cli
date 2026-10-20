import { browserStorage } from "../shared/storage";
import { clamp01 } from "../shared/math";

// User-facing audio preferences, persisted across sessions. `volume` is the
// user's 0..1 dial; the audible ceiling lives in resolveMasterGain so the mix
// never exceeds the level the soundtrack was tuned for.
export interface AudioSettings {
  muted: boolean;
  volume: number;
}

export const AUDIO_SETTINGS_KEY = "cristal.audio-settings";

export const DEFAULT_AUDIO_SETTINGS: AudioSettings = {
  muted: false,
  volume: 0.8,
};

export const MASTER_GAIN_CEILING = 0.525;

export function parseAudioSettings(raw: string | null): AudioSettings {
  if (!raw) return { ...DEFAULT_AUDIO_SETTINGS };
  try {
    const data = JSON.parse(raw) as Partial<AudioSettings> | null;
    if (!data || typeof data !== "object") return { ...DEFAULT_AUDIO_SETTINGS };
    return {
      muted: typeof data.muted === "boolean" ? data.muted : DEFAULT_AUDIO_SETTINGS.muted,
      volume:
        typeof data.volume === "number" && Number.isFinite(data.volume)
          ? clamp01(data.volume)
          : DEFAULT_AUDIO_SETTINGS.volume,
    };
  } catch {
    return { ...DEFAULT_AUDIO_SETTINGS };
  }
}

export function serializeAudioSettings(settings: AudioSettings): string {
  return JSON.stringify({ muted: settings.muted, volume: clamp01(settings.volume) });
}

export function resolveMasterGain(settings: AudioSettings): number {
  if (settings.muted) return 0;
  return clamp01(settings.volume) * MASTER_GAIN_CEILING;
}

type SettingsStorage = Pick<Storage, "getItem" | "setItem">;

export function loadAudioSettings(storage: SettingsStorage | null = browserStorage()): AudioSettings {
  if (!storage) return { ...DEFAULT_AUDIO_SETTINGS };
  try {
    return parseAudioSettings(storage.getItem(AUDIO_SETTINGS_KEY));
  } catch {
    return { ...DEFAULT_AUDIO_SETTINGS };
  }
}

export function saveAudioSettings(
  settings: AudioSettings,
  storage: SettingsStorage | null = browserStorage(),
): void {
  if (!storage) return;
  try {
    storage.setItem(AUDIO_SETTINGS_KEY, serializeAudioSettings(settings));
  } catch {
    return;
  }
}
