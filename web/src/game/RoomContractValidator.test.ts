import { describe, it, expect } from "vitest";
import { ROOM_SHAPES, coerceRoom, isWellFormedRoom } from "./RoomContractValidator";
import type { Room } from "./roomApi";

describe("RoomContractValidator", () => {
  it("coerces null and undefined input into deterministic placeholder rooms", () => {
    expect(coerceRoom(null, 2)).toEqual({
      name: "Room 2",
      inscription: "",
      description: "",
      exits: [],
      dread: 0,
      shape: "shaft",
      seed: 2,
    });

    expect(coerceRoom(undefined, 3)).toEqual({
      name: "Room 3",
      inscription: "",
      description: "",
      exits: [],
      dread: 0,
      shape: "void",
      seed: 3,
    });
  });

  it("fills missing fields with safe defaults", () => {
    expect(coerceRoom({ title: "Threshold" }, 4)).toEqual({
      name: "Threshold",
      inscription: "",
      description: "",
      exits: [],
      dread: 0,
      shape: "chamber",
      seed: 4,
    });
  });

  it("ignores wrong scalar and collection types", () => {
    expect(
      coerceRoom(
        {
          name: 42,
          title: 13,
          inscription: false,
          description: ["too", "much"],
          exits: "north",
          dread: "high",
          shape: "corridor",
          seed: Number.NaN,
        },
        1,
      ),
    ).toEqual({
      name: "Room 1",
      inscription: "",
      description: "",
      exits: [],
      dread: 0,
      shape: "corridor",
      seed: 1,
    });
  });

  it("clamps dread and defaults non-numeric dread to zero", () => {
    expect(coerceRoom({ dread: -10 }, 0).dread).toBe(0);
    expect(coerceRoom({ dread: 140 }, 0).dread).toBe(100);
    expect(coerceRoom({ dread: Number.POSITIVE_INFINITY }, 0).dread).toBe(0);
  });

  it("falls back deterministically when shape is invalid", () => {
    expect(coerceRoom({ shape: "spiral", seed: 6 }, 0).shape).toBe("shaft");
    expect(coerceRoom({ shape: "spiral" }, 7).shape).toBe("void");
    expect(ROOM_SHAPES).toEqual(["chamber", "corridor", "shaft", "void"]);
  });

  it("filters non-string exits", () => {
    expect(coerceRoom({ exits: ["north", 4, "down", null, false, "east"] }, 0).exits).toEqual([
      "north",
      "down",
      "east",
    ]);
  });

  it("strictly recognizes only well-formed rooms", () => {
    const room: Room = {
      name: "Glass Choir",
      inscription: "listen",
      description: "A still chamber humming below the floor.",
      exits: ["north", "down"],
      dread: 37,
      shape: "chamber",
      seed: 12,
    };

    expect(isWellFormedRoom(room)).toBe(true);
    expect(coerceRoom(room, 0)).toEqual(room);
  });

  it("rejects malformed rooms without coercion", () => {
    expect(isWellFormedRoom(null)).toBe(false);
    expect(isWellFormedRoom([])).toBe(false);
    expect(isWellFormedRoom({ name: "No exits", exits: "north" })).toBe(false);
    expect(isWellFormedRoom({ name: "Bad dread", dread: 120 })).toBe(false);
    expect(
      isWellFormedRoom({
        name: "Almost",
        inscription: "",
        description: "",
        exits: ["north", 0],
        dread: 50,
        shape: "void",
        seed: 1,
      }),
    ).toBe(false);
  });
});
