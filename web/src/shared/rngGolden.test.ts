import { describe, expect, it } from "vitest";
import { planAbsence } from "../game/AbsencePlanner";
import { placeBackroomFurniture } from "../game/BackroomFurniturePlacer";
import { generateMaze } from "../game/maze";
import { createPersistentTransference } from "../game/PersistentTransference";
import { RelationshipTracker } from "../game/RelationshipTracker";
import { localRoom, seedForExit, type Room } from "../game/roomApi";
import { shouldFalseDoorBite } from "../game/RuntimeTransference";
import type { WorldBehavior } from "../game/WorldBehaviorResolver";
import { createBagState, DEFAULT_REPLY_CONTEXT, drawReply } from "../terminal/psych/ReplyBag";

const SEEDS = [0, 1, 7, 42, 812, 1337, 99991, 2 ** 31 - 1, 2 ** 31 + 5, 4294967295];

describe("seeded outputs stay identical across the rng consolidation", () => {
  it("seedForExit", () => {
    expect(SEEDS.map((s) => [0, 1, 2, 5].map((i) => seedForExit(s, i)))).toMatchSnapshot();
  });

  it("localRoom", () => {
    expect(SEEDS.map((seed) => localRoom({ seed, archetype: "moon", depth: 2 }))).toMatchSnapshot();
  });

  it("placeBackroomFurniture", () => {
    const maze = generateMaze(9, 9, 1337);
    expect([1, 42, 812].map((seed) => placeBackroomFurniture(maze, seed))).toMatchSnapshot();
  });

  it("planAbsence", () => {
    const relationship = new RelationshipTracker().snapshot();
    const profile = { ...createPersistentTransference(null).getTransference(), avoidanceRate: 1, silenceTolerance: 1, ritualAffinity: 1 };
    const plans = SEEDS.map((roomSeed) => planAbsence({ roomSeed, relationship, profile, sentenceCount: 5 }));
    expect(plans.every((plan) => plan.omissions.length === 3)).toBe(true);
    expect(plans.map((plan) => plan.omissions.map((o) => o.id))).toMatchSnapshot();
  });

  it("shouldFalseDoorBite", () => {
    const behavior = { falseDoorProbability: 0.5 } as WorldBehavior;
    expect(SEEDS.map((seed) => [0, 1, 2, 3].map((i) => shouldFalseDoorBite({ seed } as Room, i, i, behavior)))).toMatchSnapshot();
  });

  it("drawReply", () => {
    const lines = ["uno", "dos", "tres", "cuatro", "cinco"].map((text) => ({ text }));
    let state = createBagState();
    const picks: string[] = [];
    for (let turn = 0; turn < 8; turn++) {
      const out = drawReply("pool", lines, { ...DEFAULT_REPLY_CONTEXT, sessionId: "s1", turn }, state);
      picks.push(out.text);
      state = out.state;
    }
    expect(picks).toMatchSnapshot();
  });
});
