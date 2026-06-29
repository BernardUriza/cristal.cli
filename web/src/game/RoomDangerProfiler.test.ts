import { describe, it, expect } from "vitest";
import type { Room } from "./roomApi";
import { profileRoomDanger } from "./RoomDangerProfiler";

function room(overrides?: Partial<Room>): Room {
  return {
    name: "Test Room",
    inscription: "Hold still.",
    description: "A room for deterministic danger profiling.",
    exits: ["north", "east"],
    dread: 20,
    shape: "chamber",
    seed: 1,
    ...overrides,
  };
}

describe("RoomDangerProfiler", () => {
  it("scores high dread rooms as dangerous", () => {
    const profile = profileRoomDanger(room({ dread: 90 }), 100, []);

    expect(profile.dangerScore).toBeGreaterThanOrEqual(70);
    expect(profile.tags).toContain("high-dread");
  });

  it("escalates low stability and high danger toward exiting now", () => {
    const profile = profileRoomDanger(room({ dread: 90 }), 10, []);

    expect(profile.dangerScore).toBeGreaterThanOrEqual(75);
    expect(profile.tags).toContain("low-stability");
    expect(profile.recommendedAction).toBe("exit-now");
  });

  it("tags revisits and raises their score", () => {
    const current = room({ dread: 50, seed: 42 });
    const baseline = profileRoomDanger(current, 80, []);
    const revisited = profileRoomDanger(current, 80, [room({ seed: 42 })]);

    expect(revisited.tags).toContain("revisit");
    expect(revisited.dangerScore).toBeGreaterThan(baseline.dangerScore);
  });

  it("distinguishes dead ends from branching rooms", () => {
    expect(profileRoomDanger(room({ exits: ["north"] }), 80, []).tags).toContain("dead-end");
    expect(profileRoomDanger(room({ exits: ["north", "east", "west"] }), 80, []).tags).toContain("branching");
  });

  it("clamps scores between zero and one hundred", () => {
    expect(profileRoomDanger(room({ dread: -50 }), 100, []).dangerScore).toBe(0);
    expect(profileRoomDanger(room({ dread: 200 }), 0, [room({ seed: 1 })]).dangerScore).toBe(100);
  });
});
