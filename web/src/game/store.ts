import { create } from "zustand";
import { GameMode, type Locomotion } from "./types";
import type { SymbolicEvent } from "./symbolicBus";

// Central runtime state, the React/Three.js analogue of LabyrinthManager.
// EnterConsoleMode / ExitConsoleMode drive the same Exploration <-> Console
// flow as the Unity coordinator, including the brief Transition state.
interface GameState {
  mode: GameMode;
  activeConsoleId: string | null;
  /** id of the console the player is currently close enough to interact with */
  nearbyConsoleId: string | null;
  /** current locomotion clip, mirrored from the Player for the debug HUD */
  locomotion: Locomotion;
  /** most recent symbolic event, surfaced in the debug HUD */
  lastSymbol: SymbolicEvent | null;

  enterConsoleMode: (consoleId: string) => void;
  exitConsoleMode: () => void;
  setNearbyConsole: (consoleId: string | null) => void;
  setLocomotion: (locomotion: Locomotion) => void;
  setLastSymbol: (event: SymbolicEvent) => void;
}

const TRANSITION_MS = 500; // matches _modeTransitionDuration

export const useGame = create<GameState>((set, get) => ({
  mode: GameMode.Exploration,
  activeConsoleId: null,
  nearbyConsoleId: null,
  locomotion: "idle",
  lastSymbol: null,

  enterConsoleMode: (consoleId) => {
    if (get().mode !== GameMode.Exploration) return;
    set({ mode: GameMode.Transition, activeConsoleId: consoleId });
    window.setTimeout(() => {
      // Only settle into Console if we are still transitioning into it.
      if (get().activeConsoleId === consoleId) {
        set({ mode: GameMode.Console });
      }
    }, TRANSITION_MS);
  },

  exitConsoleMode: () => {
    if (get().mode !== GameMode.Console) return;
    set({ mode: GameMode.Transition, activeConsoleId: null });
    window.setTimeout(() => {
      if (get().activeConsoleId === null) {
        set({ mode: GameMode.Exploration });
      }
    }, TRANSITION_MS);
  },

  setNearbyConsole: (consoleId) => set({ nearbyConsoleId: consoleId }),

  setLocomotion: (locomotion) => set({ locomotion }),

  setLastSymbol: (lastSymbol) => set({ lastSymbol }),
}));

// Dev-only handle for debugging the mode flow from the console / tests.
if (import.meta.env.DEV) {
  (window as unknown as { __game: typeof useGame }).__game = useGame;
}
