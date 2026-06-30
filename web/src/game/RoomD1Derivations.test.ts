import { describe, expect, it } from "vitest";
import { deriveRoomD1Results } from "./RoomD1Derivations";
import type { Room } from "./roomApi";

const room: Room = {
  name: "Mirror Room",
  inscription: "",
  description: "",
  exits: ["north", "east"],
  dread: 0,
  shape: "chamber",
  seed: 22,
};

describe("deriveRoomD1Results", () => {
  it("derives safe exits and micro-mirrors from the same room pressure inputs", () => {
    const result = deriveRoomD1Results({
      room,
      psychologicalStance: "confession",
      psychologicalPressure: 0.2,
      emotionalHistory: [
        { room, stance: "confession", pressure: 0.2, timestamp: 1 },
        { room, stance: "confession", pressure: 0.1, timestamp: 2 },
        { room, stance: "confession", pressure: 0.1, timestamp: 3 },
      ],
      falseDoorCount: 0,
    });

    expect(result.safeExit?.index).toBe(room.exits.length);
    expect(result.mirrors?.softenedRoomName).toBe("Unarmed Mirror Room");
  });

  it("returns empty derivations without a room", () => {
    expect(
      deriveRoomD1Results({
        room: null,
        psychologicalStance: "confession",
        psychologicalPressure: 0.2,
        emotionalHistory: [],
        falseDoorCount: 0,
      }),
    ).toEqual({ safeExit: null, mirrors: null });
  });
});
