import { audioContext } from "../../shared/audio.ts";
import { flagStore } from "../../shared/storage.ts";

export type Tone = { from: number; to: number; durationMs: number; gain: number };

export function playTone({ from, to, durationMs, gain }: Tone): void {
  const ctx = audioContext();
  if (!ctx) return;
  const osc = ctx.createOscillator();
  const amp = ctx.createGain();
  const now = ctx.currentTime;
  osc.type = "sine";
  osc.frequency.setValueAtTime(from, now);
  osc.frequency.exponentialRampToValueAtTime(to, now + durationMs / 1000);
  amp.gain.setValueAtTime(0.0001, now);
  amp.gain.exponentialRampToValueAtTime(gain, now + 0.02);
  amp.gain.exponentialRampToValueAtTime(0.0001, now + durationMs / 1000);
  osc.connect(amp).connect(ctx.destination);
  osc.start(now);
  osc.stop(now + durationMs / 1000 + 0.02);
}

export function soundSetting(storageKey: string): { load: () => boolean; save: (enabled: boolean) => void } {
  return flagStore(storageKey, true);
}
