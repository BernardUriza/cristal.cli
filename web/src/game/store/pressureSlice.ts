import { GameMode } from "../types";
import { clamp01 } from "../../shared/math";
import { appendEmotionalHistory } from "../EmotionalHistory";
import { pressureEndingComplete, resolvePressureEnding, type PressureEndingState } from "../PressureEnding";
import { getRuntimeTransference } from "../RuntimeTransference";
import type { Room } from "../roomApi";
import { StabilityEngine } from "../StabilityEngine";
import { SPIKE_DECAY_DURING_ENDING, SPIKE_DECAY_PER_SECOND } from "./config";
import type { GameSlice, GameState, PressureSlice } from "./types";

export const runtimeTransference = getRuntimeTransference();
const initialTransference = runtimeTransference.bootstrap();

// The active descent's StabilityEngine lives outside reactive state so the
// per-frame tick never re-renders; `stability` mirrors it for the HUD.
let stabilityEngine: StabilityEngine | null = null;

export const stabilityRuntime = {
  current: (): StabilityEngine | null => stabilityEngine,
  reset: (): void => {
    stabilityEngine = null;
  },
  enter: (room: Room, freshDescent: boolean): number => {
    if (freshDescent || !stabilityEngine) {
      stabilityEngine = new StabilityEngine({ dread: room.dread });
    } else {
      stabilityEngine.setDread(room.dread);
    }
    return stabilityEngine.state.stability;
  },
};

export function resolveRoomEntryPressureEnding(state: GameState): PressureEndingState | null {
  return (
    state.pressureEnding ??
    (state.psychologicalPressure >= 1
      ? resolvePressureEnding({
          pressure: state.psychologicalPressure,
          inRoom: true,
          now: Date.now(),
        })
      : null)
  );
}

export const createPressureSlice: GameSlice<PressureSlice> = (set, get) => ({
  lastSymbol: null,
  stability: 100,
  psychologicalPressure: 0,
  psychologicalStance: null,
  roomPressureSpike: 0,
  emotionalHistory: [],
  pressureEnding: null,
  transference: initialTransference,

  setLastSymbol: (lastSymbol) =>
    set({ lastSymbol, transference: runtimeTransference.observeSymbol(lastSymbol) }),

  setPsychologicalPressure: (pressure, stance) =>
    set((s) => {
      const normalizedPressure = clamp01(pressure);
      const emotionalHistory =
        s.room && stance
          ? appendEmotionalHistory(s.emotionalHistory, {
              room: { seed: s.room.seed, name: s.room.name },
              stance,
              pressure: normalizedPressure,
              timestamp: Date.now(),
            })
          : s.emotionalHistory;
      return {
        psychologicalPressure: normalizedPressure,
        psychologicalStance: stance !== undefined ? stance : s.psychologicalStance,
        pressureEnding:
          s.pressureEnding ??
          resolvePressureEnding({
            pressure: normalizedPressure,
            inRoom: s.mode === GameMode.Room && !!s.room,
            now: Date.now(),
          }),
        emotionalHistory,
        transference:
          stance !== undefined && stance
            ? runtimeTransference.recordInteraction({
                stance,
                pressure: normalizedPressure,
                room: s.room,
                history: emotionalHistory,
              })
            : s.room
              ? runtimeTransference.enterRoom({
                  room: s.room,
                  pressure: normalizedPressure,
                  history: emotionalHistory,
                })
              : s.transference,
      };
    }),

  tickStability: (dt) => {
    // no integrity drain while the next room generates: that would punish server latency
    if (!stabilityEngine || get().mode !== GameMode.Room || get().roomLoading) return;
    const ending = get().pressureEnding;
    if (ending?.active) {
      if (pressureEndingComplete(ending, Date.now())) {
        get().dismissRoom();
        return;
      }
      set((s) => ({
        stability: 100,
        roomPressureSpike: Math.max(0, s.roomPressureSpike - dt * SPIKE_DECAY_DURING_ENDING),
      }));
      return;
    }
    stabilityEngine.tick(dt);
    set((s) => ({
      stability: stabilityEngine ? stabilityEngine.state.stability : s.stability,
      roomPressureSpike: Math.max(0, s.roomPressureSpike - dt * SPIKE_DECAY_PER_SECOND),
    }));
    if (stabilityEngine.isEvicted) get().collapseRoom();
  },
});
