import { lightCell } from "../trail/trail";
import type { GameSlice, TrailSlice } from "./types";

export const createTrailSlice: GameSlice<TrailSlice> = (set) => ({
  litCells: [],
  lightCell: (x, y) => set((s) => ({ litCells: lightCell(s.litCells, x, y) })),
});
