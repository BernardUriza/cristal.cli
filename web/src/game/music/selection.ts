import { clamp01 } from "../../shared/math";
import { GameMode } from "../types";
import type { WorldBehavior } from "../WorldBehaviorResolver";

export type MusicTrack = "explore" | "terminal" | "pressure" | "dream" | "ending";

type FutureMusicMode = "Dream" | "PressureEnding";

export interface MusicSelectionState {
  mode: GameMode | FutureMusicMode;
  psychologicalPressure: number;
  pressureEnding?: { active: boolean } | null;
}

export interface MusicDirectorState extends MusicSelectionState {
  transference?: {
    worldBehavior: WorldBehavior | null;
  };
}

export const TRACK_FILES: Record<MusicTrack, string> = {
  explore: "/audio/explore.mp3",
  terminal: "/audio/terminal.mp3",
  pressure: "/audio/pressure.mp3",
  dream: "/audio/dream.mp3",
  ending: "/audio/ending.mp3",
};

export const MUSIC_TRACKS = Object.keys(TRACK_FILES) as MusicTrack[];

// The ending resolves and stays silent instead of looping (see audio manifest).
export const TRACK_LOOPS: Record<MusicTrack, boolean> = {
  explore: true,
  terminal: true,
  pressure: true,
  dream: true,
  ending: false,
};

export function selectTrack(state: MusicSelectionState): MusicTrack {
  if (state.pressureEnding?.active || state.mode === "PressureEnding") return "ending";
  if (state.mode === GameMode.Room || state.mode === "Dream") return "dream";
  if (
    state.psychologicalPressure > 0.7 &&
    (state.mode === GameMode.Exploration || state.mode === GameMode.Console)
  ) {
    return "pressure";
  }
  if (state.mode === GameMode.Console) return "terminal";
  return "explore";
}

export function resolveMusicIntensity(state: MusicDirectorState): number {
  const pressure = clamp01(state.psychologicalPressure);
  const behavior = state.transference?.worldBehavior;
  const behaviorBias = behavior
    ? clamp01(
        behavior.mirrorIntensity * 0.34 +
          behavior.architectureDrift * 0.28 +
          (1 - behavior.lightingBias) * 0.2 +
          behavior.silenceProbability * 0.18,
      )
    : 0.35;
  return clamp01(0.5 + pressure * 0.32 + behaviorBias * 0.18);
}
