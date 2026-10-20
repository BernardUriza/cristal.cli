import type { StoreApi } from "zustand";
import { saveVerticalSlice } from "../VerticalSlice";
import type { GameState } from "./types";

export function persistVerticalSlice(store: StoreApi<GameState>): () => void {
  return store.subscribe((state, previous) => {
    if (state.verticalSlice !== previous.verticalSlice) saveVerticalSlice(state.verticalSlice);
  });
}
