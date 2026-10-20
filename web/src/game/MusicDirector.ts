import { useEffect } from "react";
import { audioContext } from "../shared/audio";
import { resolveMasterGain } from "./audioSettings";
import { useGame, type GameState } from "./store";
import {
  TRACK_FILES,
  TRACK_LOOPS,
  resolveMusicIntensity,
  selectTrack,
  type MusicDirectorState,
  type MusicTrack,
} from "./music/selection";
import { getAudioSettings, subscribeAudioSettings } from "./music/settingsStore";

const CROSSFADE_SECONDS = 4.5;

function musicStateOf(state: GameState): MusicDirectorState {
  return {
    mode: state.mode,
    psychologicalPressure: state.psychologicalPressure,
    pressureEnding: state.pressureEnding,
    transference: { worldBehavior: state.transference.worldBehavior },
  };
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
  private unsubscribeSettings: (() => void) | null = null;
  private removeGestureListeners: (() => void) | null = null;

  constructor() {
    this.currentState = this.readState();
  }

  install(): () => void {
    this.currentState = this.readState();
    this.unsubscribeStore = useGame.subscribe((state) => {
      this.currentState = musicStateOf(state);
      if (this.started) this.update();
    });
    this.unsubscribeSettings = subscribeAudioSettings(() => this.applyMasterGain());

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
    return musicStateOf(useGame.getState());
  }

  private async start(): Promise<void> {
    if (this.started) return;
    const ctx = audioContext();
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
    element.loop = TRACK_LOOPS[track];
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
    const intensity = resolveMusicIntensity(this.currentState);
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
    this.ramp(this.master.gain, resolveMasterGain(getAudioSettings()), 0.35);
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
    this.unsubscribeSettings?.();
    this.unsubscribeSettings = null;
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
