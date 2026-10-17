let context: AudioContext | null = null;

function audio(): AudioContext | null {
  if (typeof window === "undefined") return null;
  const Ctor = window.AudioContext ?? (window as unknown as { webkitAudioContext?: typeof AudioContext }).webkitAudioContext;
  if (!Ctor) return null;
  if (!context) context = new Ctor();
  if (context.state === "suspended") void context.resume();
  return context;
}

export type Tone = { from: number; to: number; durationMs: number; gain: number };

export function playTone({ from, to, durationMs, gain }: Tone): void {
  const ctx = audio();
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
  return {
    load: () => {
      if (typeof window === "undefined") return true;
      try {
        return window.localStorage.getItem(storageKey) !== "off";
      } catch {
        return true;
      }
    },
    save: (enabled) => {
      if (typeof window === "undefined") return;
      try {
        window.localStorage.setItem(storageKey, enabled ? "on" : "off");
      } catch {
        return;
      }
    },
  };
}
