import { describe, expect, it } from "vitest";
import { GameMode } from "../types";
import { useGame } from "../store";
import type { Room } from "../roomApi";
import { resolveFalseDoorConsequences } from "../FalseDoorConsequences";
import { FALSE_DOOR_HISTORY_LIMIT, HISTORY_LIMIT } from "./config";
import { falseDoorHistory, falseDoorPatch, pushHistory, roomLeavePatch, sessionRoomDepths, withDangerousSeed } from "./roomFlowPatches";
import type { GameState } from "./types";

const room = (seed: number): Room => ({ name: `r${seed}`, inscription: "", description: "", exits: ["a"], dread: 0.2, shape: "chamber", seed });
const base = (): GameState => useGame.getInitialState();

describe("room flow patches", () => {
  it("moves a revisited room to the end of the history and caps it", () => {
    const history = Array.from({ length: HISTORY_LIMIT }, (_, i) => room(i));
    const next = pushHistory(history, room(0));
    expect(next.map((r) => r.seed)).toEqual([1, 2, 3, 4, 5, 6, 7, 0]);
    expect(pushHistory(next, room(99))).toHaveLength(HISTORY_LIMIT);
  });

  it("adds a dangerous seed once and ignores a missing one", () => {
    const seeds = [3];
    expect(withDangerousSeed(seeds, 3)).toBe(seeds);
    expect(withDangerousSeed(seeds, undefined)).toBe(seeds);
    expect(withDangerousSeed(seeds, 4)).toEqual([3, 4]);
  });

  it("leaving a room returns to exploration only from room mode", () => {
    const transference = base().transference;
    expect(roomLeavePatch({ ...base(), mode: GameMode.Room }, transference).mode).toBe(GameMode.Exploration);
    expect(roomLeavePatch({ ...base(), mode: GameMode.Console }, transference).mode).toBe(GameMode.Console);
    expect(sessionRoomDepths({ ...base(), depth: 5, roomHistory: [room(1), room(2)] })).toEqual([4, 5]);
  });

  it("a false door keeps the stability it had without an engine and caps its annotations", () => {
    const s: GameState = {
      ...base(),
      stability: 61,
      falseDoorAnnotations: Array.from({ length: FALSE_DOOR_HISTORY_LIMIT }, () => ({ ...resolveFalseDoorConsequences({ roomSeed: 1, exitIndex: 0, pressureBefore: 0, priorFalseDoors: 0 }).annotation, timestamp: 0 })),
    };
    const consequence = resolveFalseDoorConsequences({ roomSeed: 9, exitIndex: 1, pressureBefore: 0.4, priorFalseDoors: 2 });
    const emotionalHistory = falseDoorHistory(s, room(9), consequence, 0.5, 1000);
    const patch = falseDoorPatch(s, { room: room(9), consequence, pressure: 0.5, stability: null, emotionalHistory, verticalSlice: s.verticalSlice, transference: s.transference, now: 1000 });
    expect(patch.stability).toBe(61);
    expect(patch.falseDoorAnnotations).toHaveLength(FALSE_DOOR_HISTORY_LIMIT);
    expect(patch.falseDoorAnnotations?.[FALSE_DOOR_HISTORY_LIMIT - 1]?.timestamp).toBe(1000);
    expect(patch.dangerousSeeds).toEqual([9]);
    expect(emotionalHistory[emotionalHistory.length - 1]).toMatchObject({ room: { seed: 9 }, pressure: 0.5, timestamp: 1000 });
  });
});
