import { playTone, soundSetting } from "../minigames/kit/sound.ts";

const setting = soundSetting("cristal.memorama.sound");

export function playMatchTone(): void {
  playTone({ from: 523, to: 784, durationMs: 160, gain: 0.08 });
}

export function playWinTone(): void {
  playTone({ from: 392, to: 784, durationMs: 420, gain: 0.07 });
}

export const loadSoundEnabled = setting.load;
export const saveSoundEnabled = setting.save;
