import { mulberry32 } from "../../shared/rng";
import { loadFunnel, randomSessionId, reachFunnelStep, saveFunnel } from "../funnel";
import { reportFunnelStep } from "../funnelClient";
import { loadViaje, saveViaje } from "../viaje";
import type { GameSlice, SessionSlice } from "./types";

export const createSessionSlice: GameSlice<SessionSlice> = (set) => ({
  nearbyConsoleId: null,
  nearbyGlyphId: null,
  nearbyExit: null,
  locomotion: "idle",
  mazePose: null,
  funnel: loadFunnel(randomSessionId(mulberry32(Date.now() >>> 0)), Date.now()),
  viaje: loadViaje(),

  reachFunnel: (step, now) =>
    set((s) => {
      const next = reachFunnelStep(s.funnel, step, now);
      if (next.seconds === null) return s;
      saveFunnel(next.state);
      reportFunnelStep(next.state.sessionId, step, next.seconds);
      return { funnel: next.state };
    }),

  setViaje: (on) => {
    saveViaje(on);
    set({ viaje: on });
  },

  setNearbyConsole: (consoleId) => set({ nearbyConsoleId: consoleId }),

  setNearbyGlyph: (glyphId) => set({ nearbyGlyphId: glyphId }),

  setNearbyExit: (index) => set({ nearbyExit: index }),

  setLocomotion: (locomotion) => set({ locomotion }),

  setMazePose: (mazePose) => set({ mazePose }),
});
