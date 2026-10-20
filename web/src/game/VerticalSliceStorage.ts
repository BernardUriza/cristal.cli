import { readJson, writeJson } from "../shared/storage";
import { FRAGMENT_MAX_LENGTH, INITIAL_VERTICAL_SLICE, type SliceStep, type VerticalSliceState } from "./VerticalSlice";

const STORAGE_KEY = "cristal.verticalSlice.v1";

export function loadVerticalSlice(): VerticalSliceState {
  const saved = readJson(STORAGE_KEY);
  if (!saved || typeof saved !== "object") return INITIAL_VERTICAL_SLICE;
  const parsed = saved as Partial<VerticalSliceState>;
  return {
      ...INITIAL_VERTICAL_SLICE,
      ...parsed,
      step: normalizeStep(parsed.step),
      confessionFragment:
        typeof parsed.confessionFragment === "string"
          ? parsed.confessionFragment.slice(0, FRAGMENT_MAX_LENGTH)
          : null,
      invokedGlyph: typeof parsed.invokedGlyph === "string" ? parsed.invokedGlyph : null,
      crossedRooms: numberOrZero(parsed.crossedRooms),
      falseDoors: numberOrZero(parsed.falseDoors),
      completedRuns: numberOrZero(parsed.completedRuns),
      lastSignal: typeof parsed.lastSignal === "string" ? parsed.lastSignal : null,
    };
}

export function saveVerticalSlice(slice: VerticalSliceState): void {
  writeJson(STORAGE_KEY, slice);
}

function normalizeStep(step: unknown): SliceStep {
  return [
    "open_console",
    "confess",
    "invoke_glyph",
    "cross_room",
    "return_changed",
    "complete",
  ].includes(String(step))
    ? (step as SliceStep)
    : INITIAL_VERTICAL_SLICE.step;
}

function numberOrZero(value: unknown): number {
  return typeof value === "number" && Number.isFinite(value) ? Math.max(0, value) : 0;
}
