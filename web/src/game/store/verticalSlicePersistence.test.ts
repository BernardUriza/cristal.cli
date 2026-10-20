import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { useGame } from "../store";
import { resetPsychSession } from "../../terminal/psych/PsychologicalResponseEngine";

const KEY = "cristal.verticalSlice.v1";

function roomResponse(name: string): Response {
  return {
    ok: true,
    json: async () => ({ name, inscription: "", description: "", exits: ["norte", "sur"], dread: 0, shape: "chamber" }),
    text: async () => "",
  } as Response;
}

async function settle(): Promise<void> {
  for (let attempt = 0; attempt < 20; attempt += 1) await Promise.resolve();
}

describe("vertical slice persistence", () => {
  const writes: string[] = [];
  const saved = new Map<string, string>();

  beforeEach(() => {
    writes.length = 0;
    saved.clear();
    vi.stubGlobal("window", {
      setTimeout: globalThis.setTimeout,
      localStorage: {
        getItem: (key: string) => saved.get(key) ?? null,
        setItem: (key: string, value: string) => {
          saved.set(key, value);
          if (key === KEY) writes.push(value);
        },
      },
    });
    vi.stubGlobal("fetch", vi.fn(async () => roomResponse("Umbral")));
  });

  afterEach(() => {
    vi.unstubAllGlobals();
    resetPsychSession();
    useGame.setState(useGame.getInitialState(), true);
  });

  it("stores every slice the room and console flows reach, at the moment they reach it", async () => {
    const stored = () => saved.get(KEY);
    const current = () => JSON.stringify(useGame.getState().verticalSlice);
    const reached: string[] = [];
    const check = () => {
      expect(stored()).toBe(current());
      reached.push(current());
    };

    useGame.getState().enterConsoleMode("console_alpha");
    check();
    useGame.getState().recordConsoleInput("tengo miedo de olvidar a mi madre");
    check();
    useGame.getState().invokeGlyph("echo", "glyph-a");
    check();
    await settle();
    useGame.getState().takeExit(0);
    check();
    await settle();
    useGame.getState().dismissRoom();
    check();
    useGame.getState().startNextVariation();
    check();

    expect(writes.filter((value, i) => value !== writes[i - 1])).toEqual(reached);
    expect(reached.map((value) => (JSON.parse(value) as { step: string }).step)).toEqual([
      "confess",
      "invoke_glyph",
      "cross_room",
      "return_changed",
      "complete",
      "open_console",
    ]);
  });
});
