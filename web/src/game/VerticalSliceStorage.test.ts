import { afterAll, beforeEach, describe, expect, it } from "vitest";
import { INITIAL_VERTICAL_SLICE, type VerticalSliceState } from "./VerticalSlice";
import { loadVerticalSlice, saveVerticalSlice } from "./VerticalSliceStorage";

const STORAGE_KEY = "cristal.verticalSlice.v1";

describe("persistence", () => {
  const store = new Map<string, string>();
  const fakeWindow = {
    localStorage: {
      getItem: (key: string) => store.get(key) ?? null,
      setItem: (key: string, value: string) => void store.set(key, value),
      clear: () => store.clear(),
    },
  };
  const originalWindow = (globalThis as { window?: unknown }).window;
  (globalThis as { window?: unknown }).window = fakeWindow;

  beforeEach(() => {
    store.clear();
  });

  afterAll(() => {
    (globalThis as { window?: unknown }).window = originalWindow;
  });

  it("round-trips a slice through localStorage", () => {
    const slice: VerticalSliceState = {
      step: "return_changed",
      confessed: true,
      confessionFragment: "tengo miedo de olvidar",
      invokedGlyph: "glyph-vision",
      crossedRooms: 3,
      falseDoors: 1,
      completedRuns: 2,
      lastSignal: "algo cambió",
    };
    saveVerticalSlice(slice);
    expect(loadVerticalSlice()).toEqual(slice);
  });

  it("falls back to the initial slice on missing or corrupt storage", () => {
    expect(loadVerticalSlice()).toEqual(INITIAL_VERTICAL_SLICE);
    fakeWindow.localStorage.setItem(STORAGE_KEY, "{not json");
    expect(loadVerticalSlice()).toEqual(INITIAL_VERTICAL_SLICE);
  });

  it("sanitizes bogus persisted values", () => {
    fakeWindow.localStorage.setItem(
      STORAGE_KEY,
      JSON.stringify({
        step: "hacked",
        crossedRooms: -4,
        invokedGlyph: 9,
        lastSignal: 1,
        confessionFragment: 42,
      })
    );
    const loaded = loadVerticalSlice();
    expect(loaded.step).toBe("open_console");
    expect(loaded.crossedRooms).toBe(0);
    expect(loaded.invokedGlyph).toBeNull();
    expect(loaded.lastSignal).toBeNull();
    expect(loaded.confessionFragment).toBeNull();
  });
});
