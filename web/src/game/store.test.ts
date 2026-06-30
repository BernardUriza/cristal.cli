import { afterEach, describe, expect, it, vi } from "vitest";
import { GameMode } from "./types";
import { useGame } from "./store";

function responseWithJson(payload: unknown): Response {
  return {
    ok: true,
    json: async () => payload,
    text: async () => "",
  } as Response;
}

async function waitForRoom(): Promise<void> {
  for (let attempt = 0; attempt < 20; attempt += 1) {
    await Promise.resolve();
    if (useGame.getState().room) return;
  }
  throw new Error("room did not load");
}

describe("game store pressure ending", () => {
  afterEach(() => {
    vi.unstubAllGlobals();
    useGame.setState(useGame.getInitialState(), true);
  });

  it("starts the pressure ending when full pressure from the maze enters a fresh room", async () => {
    vi.stubGlobal(
      "fetch",
      vi.fn(async () =>
        responseWithJson({
          name: "Threshold",
          inscription: "",
          description: "",
          exits: ["north"],
          dread: 0,
          shape: "chamber",
        }),
      ),
    );

    useGame.getState().setPsychologicalPressure(1, "deflection");
    expect(useGame.getState().pressureEnding).toBeNull();

    useGame.getState().invokeGlyph("echo", "glyph-a");
    await waitForRoom();

    expect(useGame.getState().mode).toBe(GameMode.Room);
    expect(useGame.getState().pressureEnding?.active).toBe(true);
  });

  it("starts the pressure ending when full pressure from the maze enters a cached room", async () => {
    const fetchRoom = vi.fn(async () =>
      responseWithJson({
        name: "Cached Threshold",
        inscription: "",
        description: "",
        exits: ["north"],
        dread: 0,
        shape: "chamber",
      }),
    );
    vi.stubGlobal("fetch", fetchRoom);

    useGame.getState().invokeGlyph("echo", "glyph-cache");
    await waitForRoom();
    useGame.setState(useGame.getInitialState(), true);

    useGame.getState().setPsychologicalPressure(1, "deflection");
    expect(useGame.getState().pressureEnding).toBeNull();

    useGame.getState().invokeGlyph("echo", "glyph-cache");

    expect(fetchRoom).toHaveBeenCalledTimes(1);
    expect(useGame.getState().mode).toBe(GameMode.Room);
    expect(useGame.getState().pressureEnding?.active).toBe(true);
  });
});
