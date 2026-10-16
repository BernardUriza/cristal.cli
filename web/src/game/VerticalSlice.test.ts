import { afterAll, beforeEach, describe, expect, it } from "vitest";
import {
  authoredBeats,
  beginNextVariation,
  confessionFragmentsForRoom,
  INITIAL_VERTICAL_SLICE,
  loadVerticalSlice,
  noteConsoleInput,
  noteConsoleOpened,
  noteFalseDoor,
  noteGlyphInvoked,
  noteRoomCrossed,
  noteRoomDismissed,
  objectiveForSlice,
  runSummary,
  saveVerticalSlice,
  type VerticalSliceState,
} from "./VerticalSlice";

const STORAGE_KEY = "cristal.verticalSlice.v1";

describe("objectiveForSlice", () => {
  it("gives a readable objective for every step", () => {
    const steps: VerticalSliceState["step"][] = [
      "open_console",
      "confess",
      "invoke_glyph",
      "cross_room",
      "return_changed",
      "complete",
    ];
    for (const step of steps) {
      const text = objectiveForSlice({ ...INITIAL_VERTICAL_SLICE, step });
      expect(text.length).toBeGreaterThan(10);
    }
  });

  it("starts by asking the player to connect a console", () => {
    expect(objectiveForSlice(INITIAL_VERTICAL_SLICE)).toMatch(/consola/i);
  });
});

describe("guided first minutes", () => {
  it("advances open_console -> confess when a console is opened", () => {
    const next = noteConsoleOpened(INITIAL_VERTICAL_SLICE, "C-01");
    expect(next.step).toBe("confess");
    expect(next.lastSignal).toContain("C-01");
  });

  it("does not regress once past open_console", () => {
    const confessing: VerticalSliceState = { ...INITIAL_VERTICAL_SLICE, step: "invoke_glyph" };
    expect(noteConsoleOpened(confessing, "C-02")).toBe(confessing);
  });

  it("accepts an emotional phrase as confession and moves to invoke_glyph", () => {
    const slice: VerticalSliceState = { ...INITIAL_VERTICAL_SLICE, step: "confess" };
    const next = noteConsoleInput(slice, "tengo miedo de olvidar quien soy");
    expect(next.confessed).toBe(true);
    expect(next.step).toBe("invoke_glyph");
  });

  it("archives the confession as a short fragment and quotes it in the signal", () => {
    const slice: VerticalSliceState = { ...INITIAL_VERTICAL_SLICE, step: "confess" };
    const next = noteConsoleInput(slice, "  tengo   miedo de olvidar  ");
    expect(next.confessionFragment).toBe("tengo miedo de olvidar");
    expect(next.lastSignal).toContain("tengo miedo de olvidar");
  });

  it("caps the archived fragment at 64 characters", () => {
    const slice: VerticalSliceState = { ...INITIAL_VERTICAL_SLICE, step: "confess" };
    const next = noteConsoleInput(slice, "x".repeat(200));
    expect(next.confessionFragment).toHaveLength(64);
  });

  it("rejects known commands and short input as confession", () => {
    const slice: VerticalSliceState = { ...INITIAL_VERTICAL_SLICE, step: "confess" };
    expect(noteConsoleInput(slice, "help")).toBe(slice);
    expect(noteConsoleInput(slice, "status")).toBe(slice);
    expect(noteConsoleInput(slice, "who am i")).toBe(slice);
    expect(noteConsoleInput(slice, "ok")).toBe(slice);
  });

  it("rejects every canonical terminal command as confession via the shared parser", () => {
    const slice: VerticalSliceState = { ...INITIAL_VERTICAL_SLICE, step: "confess" };
    expect(noteConsoleInput(slice, "summon the moon")).toBe(slice);
    expect(noteConsoleInput(slice, "save partida uno")).toBe(slice);
    expect(noteConsoleInput(slice, "load checkpoint")).toBe(slice);
    expect(noteConsoleInput(slice, "invoke luna")).toBe(slice);
    expect(noteConsoleInput(slice, "export memoria")).toBe(slice);
  });

  it("still accepts an emotional phrase that starts like no command", () => {
    const slice: VerticalSliceState = { ...INITIAL_VERTICAL_SLICE, step: "confess" };
    const next = noteConsoleInput(slice, "me da miedo la oscuridad del pasillo");
    expect(next.confessed).toBe(true);
    expect(next.confessionFragment).toBe("me da miedo la oscuridad del pasillo");
  });

  it("ignores input once already confessed", () => {
    const slice: VerticalSliceState = {
      ...INITIAL_VERTICAL_SLICE,
      step: "cross_room",
      confessed: true,
    };
    expect(noteConsoleInput(slice, "otra frase emocional larga")).toBe(slice);
  });

  it("moves to cross_room when a glyph is invoked", () => {
    const slice: VerticalSliceState = {
      ...INITIAL_VERTICAL_SLICE,
      step: "invoke_glyph",
      confessed: true,
    };
    const next = noteGlyphInvoked(slice, "glyph-moon", "moon");
    expect(next.step).toBe("cross_room");
    expect(next.invokedGlyph).toBe("glyph-moon");
    expect(next.lastSignal).toContain("MOON");
  });

  it("makes the glyph answer the archived confession", () => {
    const slice: VerticalSliceState = {
      ...INITIAL_VERTICAL_SLICE,
      step: "invoke_glyph",
      confessed: true,
      confessionFragment: "tengo miedo de olvidar",
    };
    const next = noteGlyphInvoked(slice, "glyph-moon", "moon");
    expect(next.lastSignal).toContain("tengo miedo de olvidar");
    expect(next.lastSignal).toContain("MOON");
  });

  it("counts crossed rooms and asks the player to return", () => {
    const slice: VerticalSliceState = { ...INITIAL_VERTICAL_SLICE, step: "cross_room" };
    const next = noteRoomCrossed(slice, "puerta norte");
    expect(next.step).toBe("return_changed");
    expect(next.crossedRooms).toBe(1);
    expect(next.lastSignal).toContain("puerta norte");
  });

  it("counts false doors without breaking the step", () => {
    const slice: VerticalSliceState = { ...INITIAL_VERTICAL_SLICE, step: "cross_room" };
    const next = noteFalseDoor(slice);
    expect(next.falseDoors).toBe(1);
    expect(next.step).toBe("cross_room");
  });

  it("completes the run when the room is dismissed after crossing", () => {
    const slice: VerticalSliceState = { ...INITIAL_VERTICAL_SLICE, step: "return_changed" };
    const next = noteRoomDismissed(slice);
    expect(next.step).toBe("complete");
    expect(next.completedRuns).toBe(1);
  });

  it("does not complete the run when dismissing before crossing", () => {
    const slice: VerticalSliceState = { ...INITIAL_VERTICAL_SLICE, step: "cross_room" };
    expect(noteRoomDismissed(slice)).toBe(slice);
  });

  it("names the confession when the first door is crossed", () => {
    const slice: VerticalSliceState = {
      ...INITIAL_VERTICAL_SLICE,
      step: "cross_room",
      confessed: true,
      confessionFragment: "tengo miedo",
    };
    const next = noteRoomCrossed(slice, "puerta norte");
    expect(next.lastSignal).toContain("tengo miedo");
  });

  it("closes the return beat quoting the archived confession", () => {
    const slice: VerticalSliceState = {
      ...INITIAL_VERTICAL_SLICE,
      step: "return_changed",
      confessed: true,
      confessionFragment: "tengo miedo",
      crossedRooms: 1,
    };
    const next = noteRoomDismissed(slice);
    expect(next.step).toBe("complete");
    expect(next.lastSignal).toContain("tengo miedo");
  });
});

describe("confessionFragmentsForRoom", () => {
  it("returns an empty prompt payload before confessing", () => {
    expect(confessionFragmentsForRoom(INITIAL_VERTICAL_SLICE)).toEqual([]);
  });

  it("carries the archived confession into the room prompt", () => {
    const slice: VerticalSliceState = {
      ...INITIAL_VERTICAL_SLICE,
      confessed: true,
      confessionFragment: "tengo miedo de olvidar",
    };
    expect(confessionFragmentsForRoom(slice)).toEqual([
      "confesión del jugador: tengo miedo de olvidar",
    ]);
  });
});

describe("authoredBeats", () => {
  it("presents three pending beats at the start", () => {
    const beats = authoredBeats(INITIAL_VERTICAL_SLICE);
    expect(beats).toHaveLength(3);
    expect(beats.every((b) => !b.done)).toBe(true);
    expect(beats.map((b) => b.id)).toEqual(["confession", "glyph", "threshold"]);
  });

  it("marks beats done in authored order as the slice advances", () => {
    const confessed: VerticalSliceState = {
      ...INITIAL_VERTICAL_SLICE,
      confessed: true,
      confessionFragment: "tengo miedo",
      step: "invoke_glyph",
    };
    expect(authoredBeats(confessed).map((b) => b.done)).toEqual([true, false, false]);
    expect(authoredBeats(confessed)[0]!.label).toContain("tengo miedo");

    const invoked: VerticalSliceState = { ...confessed, invokedGlyph: "glyph-moon", step: "cross_room" };
    expect(authoredBeats(invoked).map((b) => b.done)).toEqual([true, true, false]);

    const crossed: VerticalSliceState = { ...invoked, crossedRooms: 1, step: "return_changed" };
    expect(authoredBeats(crossed).map((b) => b.done)).toEqual([true, true, true]);
    expect(authoredBeats(crossed)[2]!.label).toContain("regresas cambiado");
  });
});

describe("run closure", () => {
  const completed: VerticalSliceState = {
    step: "complete",
    confessed: true,
    confessionFragment: "tengo miedo de olvidar",
    invokedGlyph: "glyph-vision",
    crossedRooms: 3,
    falseDoors: 1,
    completedRuns: 2,
    lastSignal: "regresas cambiado",
  };

  it("summarizes what the run consumed", () => {
    expect(runSummary(completed)).toEqual({
      phrase: "tengo miedo de olvidar",
      glyph: "glyph-vision",
      crossedRooms: 3,
      falseDoors: 1,
      completedRuns: 2,
    });
  });

  it("summarizes an empty slice with nulls, never invented values", () => {
    expect(runSummary(INITIAL_VERTICAL_SLICE)).toEqual({
      phrase: null,
      glyph: null,
      crossedRooms: 0,
      falseDoors: 0,
      completedRuns: 0,
    });
  });

  it("opens the next variation only from a closed rite", () => {
    const midRun: VerticalSliceState = { ...completed, step: "cross_room" };
    expect(beginNextVariation(midRun)).toBe(midRun);
    expect(beginNextVariation(INITIAL_VERTICAL_SLICE)).toBe(INITIAL_VERTICAL_SLICE);
  });

  it("resets the per-run fields but keeps the completed-run tally", () => {
    const next = beginNextVariation(completed);
    expect(next.step).toBe("open_console");
    expect(next.confessed).toBe(false);
    expect(next.confessionFragment).toBeNull();
    expect(next.invokedGlyph).toBeNull();
    expect(next.crossedRooms).toBe(0);
    expect(next.falseDoors).toBe(0);
    expect(next.completedRuns).toBe(2);
  });

  it("announces the next variation quoting the archived phrase", () => {
    const next = beginNextVariation(completed);
    expect(next.lastSignal).toContain("Variación 3");
    expect(next.lastSignal).toContain("tengo miedo de olvidar");
  });

  it("announces the next variation without a phrase when none was archived", () => {
    const silent: VerticalSliceState = { ...completed, confessionFragment: null };
    const next = beginNextVariation(silent);
    expect(next.lastSignal).toContain("Variación 3");
    expect(next.lastSignal).not.toContain("«");
  });
});

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
