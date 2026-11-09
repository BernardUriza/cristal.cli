import { audioContext } from "../../shared/audio";
import { resolveMasterGain } from "../audioSettings";
import { getAudioSettings } from "../music/settingsStore";

// A soft bell: a sine with a quiet octave above it, a quick attack and a long tail.
export function playStepNote(frequency: number, level: number): void {
  const master = resolveMasterGain(getAudioSettings());
  if (master <= 0) return;
  const ac = audioContext();
  if (!ac) return;
  const t = ac.currentTime;
  const gain = ac.createGain();
  gain.gain.setValueAtTime(0.0001, t);
  gain.gain.linearRampToValueAtTime(0.5 * level * master, t + 0.012);
  gain.gain.exponentialRampToValueAtTime(0.0001, t + 1.4);
  gain.connect(ac.destination);

  const body = ac.createOscillator();
  body.type = "sine";
  body.frequency.setValueAtTime(frequency, t);
  body.connect(gain);

  const shimmer = ac.createOscillator();
  const shimmerGain = ac.createGain();
  shimmer.type = "triangle";
  shimmer.frequency.setValueAtTime(frequency * 2, t);
  shimmerGain.gain.setValueAtTime(0.25, t);
  shimmer.connect(shimmerGain);
  shimmerGain.connect(gain);

  body.start(t);
  shimmer.start(t);
  body.stop(t + 1.45);
  shimmer.stop(t + 1.45);
}

export function playChord(frequencies: readonly number[], level: number): void {
  frequencies.forEach((frequency, i) => window.setTimeout(() => playStepNote(frequency, level), i * 140));
}
