import { clamp01 } from "../../shared/math";
import { loadAudioSettings, saveAudioSettings, type AudioSettings } from "../audioSettings";

let settings: AudioSettings = loadAudioSettings();
const settingsListeners = new Set<() => void>();

function commitSettings(next: AudioSettings): void {
  settings = next;
  saveAudioSettings(settings);
  for (const listener of settingsListeners) listener();
}

export function setMusicMuted(nextMuted: boolean): void {
  commitSettings({ ...settings, muted: nextMuted });
}

export function setMusicVolume(volume: number): void {
  commitSettings({ ...settings, volume: clamp01(volume) });
}

export function getAudioSettings(): AudioSettings {
  return settings;
}

export function subscribeAudioSettings(listener: () => void): () => void {
  settingsListeners.add(listener);
  return () => settingsListeners.delete(listener);
}
