import { afterEach, describe, expect, it, vi } from "vitest";
import { GameMode } from "./types";
import { useGame } from "./store";
import { resetPsychSession } from "../terminal/psych/PsychologicalResponseEngine";
import type { Room } from "./roomApi";

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
    resetPsychSession();
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

describe("game store stale room responses", () => {
  afterEach(() => {
    vi.unstubAllGlobals();
    resetPsychSession();
    useGame.setState(useGame.getInitialState(), true);
  });

  async function flushMicrotasks(): Promise<void> {
    for (let i = 0; i < 20; i += 1) await Promise.resolve();
  }

  it("ignores a late server room after the descent was dismissed", async () => {
    let resolveFetch: ((r: Response) => void) | undefined;
    vi.stubGlobal(
      "fetch",
      vi.fn(
        () =>
          new Promise<Response>((resolve) => {
            resolveFetch = resolve;
          }),
      ),
    );

    useGame.getState().invokeGlyph("echo", "glyph-stale-dismiss");
    expect(useGame.getState().roomLoading).toBe(true);

    useGame.getState().dismissRoom();
    expect(useGame.getState().roomLoading).toBe(false);

    resolveFetch?.(
      responseWithJson({
        name: "Late Room",
        inscription: "",
        description: "",
        exits: ["north"],
        dread: 0,
        shape: "chamber",
      }),
    );
    await flushMicrotasks();

    expect(useGame.getState().room).toBeNull();
    expect(useGame.getState().mode).toBe(GameMode.Exploration);
    expect(useGame.getState().roomLoading).toBe(false);
  });

  it("ignores a late server room after the room collapsed", async () => {
    let resolveFetch: ((r: Response) => void) | undefined;
    vi.stubGlobal(
      "fetch",
      vi.fn(
        () =>
          new Promise<Response>((resolve) => {
            resolveFetch = resolve;
          }),
      ),
    );

    useGame.getState().invokeGlyph("echo", "glyph-stale-collapse");
    expect(useGame.getState().roomLoading).toBe(true);

    useGame.getState().collapseRoom();

    resolveFetch?.(
      responseWithJson({
        name: "Collapsed Late Room",
        inscription: "",
        description: "",
        exits: ["north"],
        dread: 0,
        shape: "chamber",
      }),
    );
    await flushMicrotasks();

    expect(useGame.getState().room).toBeNull();
    expect(useGame.getState().mode).toBe(GameMode.Exploration);
    expect(useGame.getState().roomLoading).toBe(false);
  });
});

describe("game store pressure normalization", () => {
  afterEach(() => {
    vi.unstubAllGlobals();
    resetPsychSession();
    useGame.setState(useGame.getInitialState(), true);
  });

  it("uses normalized pressure for pressure endings and emotional history", () => {
    const room: Room = {
      name: "Measured Room",
      inscription: "",
      description: "",
      exits: ["north"],
      dread: 0,
      shape: "chamber",
      seed: 12,
    };
    useGame.setState({ mode: GameMode.Room, room });

    useGame.getState().setPsychologicalPressure(100, "deflection");

    expect(useGame.getState().psychologicalPressure).toBe(1);
    expect(useGame.getState().pressureEnding?.active).toBe(true);
    const history = useGame.getState().emotionalHistory;
    expect(history[history.length - 1]?.pressure).toBe(1);
  });

  it("records false-door stance from the consequence contract", () => {
    const room: Room = {
      name: "Forked Room",
      inscription: "",
      description: "",
      exits: ["north", "east"],
      dread: 0,
      shape: "corridor",
      seed: 5,
    };
    useGame.setState({ mode: GameMode.Room, room, roomArchetype: "echo" });

    useGame.getState().takeExit(1);

    expect(useGame.getState().psychologicalStance).toBe("deflection");
    const history = useGame.getState().emotionalHistory;
    const annotations = useGame.getState().falseDoorAnnotations;
    expect(history[history.length - 1]?.stance).toBe("deflection");
    expect(annotations[annotations.length - 1]?.kind).toBe("false-door-avoidance");
  });
});
