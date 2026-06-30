import { useEffect } from "react";
import { clamp01 } from "../shared/math";
import { getCtx } from "./audio";
import { useGame } from "./store";
import { GameMode } from "./types";
import type { WorldBehavior } from "./WorldBehaviorResolver";

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

const TRACK_FILES: Record<MusicTrack, string> = {
  explore: "/audio/explore.mp3",
  terminal: "/audio/terminal.mp3",
  pressure: "/audio/pressure.mp3",
  dream: "/audio/dream.mp3",
  ending: "/audio/ending.mp3",
};

const CROSSFADE_SECONDS = 4.5;
const MASTER_VOLUME = 0.42;

let muted = false;

export function setMusicMuted(nextMuted: boolean): void {
  muted = nextMuted;
  director?.applyMasterGain();
}

export function isMusicMuted(): boolean {
  return muted;
}

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

interface TrackRuntime {
  element: HTMLAudioElement;
  source: MediaElementAudioSourceNode;
  gain: GainNode;
}

class MusicDirectorRuntime {
  private ctx: AudioContext | null = null;
  private master: GainNode | null = null;
  private tracks = new Map<MusicTrack, TrackRuntime>();
  private activeTrack: MusicTrack | null = null;
  private currentState: MusicDirectorState;
  private started = false;
  private unsubscribeStore: (() => void) | null = null;
  private removeGestureListeners: (() => void) | null = null;

  constructor() {
    this.currentState = this.readState();
  }

  install(): () => void {
    this.currentState = this.readState();
    this.unsubscribeStore = useGame.subscribe((state) => {
      this.currentState = {
        mode: state.mode,
        psychologicalPressure: state.psychologicalPressure,
        pressureEnding: state.pressureEnding,
        transference: {
          worldBehavior: state.transference.worldBehavior,
        },
      };
      if (this.started) this.update();
    });

    const unlock = () => {
      void this.start();
    };
    window.addEventListener("pointerdown", unlock, { once: true });
    window.addEventListener("keydown", unlock, { once: true });
    window.addEventListener("touchstart", unlock, { once: true });
    this.removeGestureListeners = () => {
      window.removeEventListener("pointerdown", unlock);
      window.removeEventListener("keydown", unlock);
      window.removeEventListener("touchstart", unlock);
    };

    return () => this.dispose();
  }

  private readState(): MusicDirectorState {
    const state = useGame.getState();
    return {
      mode: state.mode,
      psychologicalPressure: state.psychologicalPressure,
      pressureEnding: state.pressureEnding,
      transference: {
        worldBehavior: state.transference.worldBehavior,
      },
    };
  }

  private async start(): Promise<void> {
    if (this.started) return;
    const ctx = getCtx();
    if (!ctx) return;
    this.ctx = ctx;
    this.master = ctx.createGain();
    this.master.connect(ctx.destination);
    this.started = true;
    this.removeGestureListeners?.();
    this.removeGestureListeners = null;
    this.applyMasterGain();
    this.update();
  }

  private getTrack(track: MusicTrack): TrackRuntime | null {
    if (!this.ctx || !this.master) return null;
    const existing = this.tracks.get(track);
    if (existing) return existing;

    const element = new Audio(TRACK_FILES[track]);
    element.loop = true;
    element.preload = "metadata";
    element.crossOrigin = "anonymous";
    const source = this.ctx.createMediaElementSource(element);
    const gain = this.ctx.createGain();
    gain.gain.value = 0;
    source.connect(gain);
    gain.connect(this.master);

    const runtime = { element, source, gain };
    this.tracks.set(track, runtime);
    return runtime;
  }

  private update(): void {
    if (!this.ctx) return;
    const nextTrack = selectTrack(this.currentState);
    const intensity = this.resolveIntensity();
    this.applyMasterGain();

    if (this.activeTrack === nextTrack) {
      const active = this.getTrack(nextTrack);
      if (active) this.ramp(active.gain.gain, intensity, 0.5);
      return;
    }

    const previousTrack = this.activeTrack;
    const previous = previousTrack ? this.tracks.get(previousTrack) : null;
    const next = this.getTrack(nextTrack);
    if (!next) return;

    this.activeTrack = nextTrack;
    next.element.volume = 1;
    void next.element.play().catch(() => undefined);
    this.ramp(next.gain.gain, intensity, CROSSFADE_SECONDS);

    if (previous) {
      const priorElement = previous.element;
      this.ramp(previous.gain.gain, 0, CROSSFADE_SECONDS);
      window.setTimeout(() => {
        if (this.activeTrack !== previousTrack && priorElement.readyState > 0) {
          priorElement.pause();
        }
      }, CROSSFADE_SECONDS * 1000 + 80);
    }
  }

  applyMasterGain(): void {
    if (!this.ctx || !this.master) return;
    this.ramp(this.master.gain, muted ? 0 : MASTER_VOLUME, 0.35);
  }

  private resolveIntensity(): number {
    const pressure = clamp01(this.currentState.psychologicalPressure);
    const behavior = this.currentState.transference?.worldBehavior;
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

  private ramp(param: AudioParam, value: number, seconds: number): void {
    if (!this.ctx) return;
    const now = this.ctx.currentTime;
    param.cancelScheduledValues(now);
    param.setValueAtTime(param.value, now);
    param.linearRampToValueAtTime(value, now + seconds);
  }

  private dispose(): void {
    this.unsubscribeStore?.();
    this.unsubscribeStore = null;
    this.removeGestureListeners?.();
    this.removeGestureListeners = null;
    for (const runtime of this.tracks.values()) {
      runtime.element.pause();
      runtime.source.disconnect();
      runtime.gain.disconnect();
    }
    this.tracks.clear();
    this.master?.disconnect();
    this.master = null;
    this.activeTrack = null;
    this.started = false;
  }
}

let director: MusicDirectorRuntime | null = null;

export function MusicDirector(): null {
  useEffect(() => {
    director ??= new MusicDirectorRuntime();
    return director.install();
  }, []);
  return null;
}
