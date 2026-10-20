import { GameMode } from "../types";
import { leaveEcho } from "../echoClient";
import { noteConsoleInput, noteConsoleOpened } from "../VerticalSlice";
import { TRANSITION_MS } from "./config";
import type { ConsoleSlice, GameSlice } from "./types";

export const createConsoleSlice: GameSlice<ConsoleSlice> = (set, get) => ({
  mode: GameMode.Exploration,
  activeConsoleId: null,

  enterConsoleMode: (consoleId) => {
    if (get().mode !== GameMode.Exploration) return;
    const nextSlice = noteConsoleOpened(get().verticalSlice, consoleId.toUpperCase());
    get().reachFunnel("console_open", Date.now());
    set({ mode: GameMode.Transition, activeConsoleId: consoleId, verticalSlice: nextSlice });
    window.setTimeout(() => {
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

  recordConsoleInput: (input) => {
    const before = get().verticalSlice;
    const verticalSlice = noteConsoleInput(before, input);
    if (verticalSlice === before) return;
    set({ verticalSlice });
    if (!before.confessed && verticalSlice.confessed && verticalSlice.confessionFragment) {
      leaveEcho(verticalSlice.confessionFragment);
      get().fetchForeignEcho();
    }
  },
});
