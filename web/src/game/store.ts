import { create } from "zustand";
import type { GameState } from "./store/types";
import { createSessionSlice } from "./store/sessionSlice";
import { createConsoleSlice } from "./store/consoleSlice";
import { createWallsSlice } from "./store/wallsSlice";
import { createPressureSlice } from "./store/pressureSlice";
import { createRoomFlowSlice } from "./store/roomFlowSlice";
import { persistVerticalSlice } from "./store/persistVerticalSlice";

export type { GameState, MazePose } from "./store/types";
export { fakeExitForRoom } from "./store/roomCache";

// The React/Three.js analogue of LabyrinthManager: one store, composed from
// slices that each own their fields; cross-slice calls go through get().
export const useGame = create<GameState>()((...a) => ({
  ...createSessionSlice(...a),
  ...createConsoleSlice(...a),
  ...createWallsSlice(...a),
  ...createPressureSlice(...a),
  ...createRoomFlowSlice(...a),
}));

persistVerticalSlice(useGame);

if (import.meta.env.DEV && typeof window !== "undefined") {
  (window as unknown as { __game: typeof useGame }).__game = useGame;
}
