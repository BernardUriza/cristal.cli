import { GameMode } from "../types";
import { leaveEcho } from "../echoClient";
import { noteConsoleInput, noteConsoleOpened } from "../VerticalSlice";
import { worldNodeById } from "../worldNodes";
import { TRANSITION_MS } from "./config";
import type { ConsoleSlice, GameSlice } from "./types";

export const createConsoleSlice: GameSlice<ConsoleSlice> = (set, get) => ({
  mode: GameMode.Exploration,
  activeConsoleId: null,

  enterConsoleMode: (consoleId) => {
    const leaving = get().mode === GameMode.Transition && get().activeConsoleId === null;
    if (get().mode !== GameMode.Exploration && !leaving) return;
    // The overlay owns the mouse; a captured pointer would hide it and swallow the first ESC.
    if (typeof document !== "undefined" && document.pointerLockElement) document.exitPointerLock();
    // Talking to an inhabitant borrows the console mode (camera, overlay, ESC) but is not the rite.
    const isNpc = worldNodeById(consoleId)?.kind === "npc";
    const nextSlice = isNpc ? get().verticalSlice : noteConsoleOpened(get().verticalSlice, consoleId.toUpperCase());
    if (!isNpc) get().reachFunnel("console_open", Date.now());
    set({ mode: GameMode.Transition, activeConsoleId: consoleId, verticalSlice: nextSlice });
    window.setTimeout(() => {
      if (get().activeConsoleId === consoleId) {
        set({ mode: GameMode.Console });
      }
    }, TRANSITION_MS);
  },

  exitConsoleMode: () => {
    if (get().activeConsoleId === null) return;
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
