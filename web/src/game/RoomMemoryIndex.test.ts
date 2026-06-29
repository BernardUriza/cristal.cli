import { describe, it, expect } from "vitest";
import { RoomMemoryIndex, type RoomRecord } from "./RoomMemoryIndex";
import type { Room } from "./roomApi";

function makeRoom(seed: number, name: string): Room {
  return {
    name,
    inscription: "",
    description: "",
    exits: [],
    dread: 0,
    shape: "chamber",
    seed,
  };
}

describe("RoomMemoryIndex", () => {
  it("adds rooms, de-dupes by seed, and keeps first-seen order", () => {
    const index = new RoomMemoryIndex();

    index.addRoom({ room: makeRoom(1, "First Room"), dangerScore: 2 });
    index.addRoom({ room: makeRoom(2, "Second Room"), dangerScore: 3 });
    index.addRoom({ room: makeRoom(1, "First Room Revised"), dangerScore: 9 });

    expect(index.size).toBe(2);
    expect(index.all()).toEqual([
      { room: makeRoom(1, "First Room Revised"), dangerScore: 9 },
      { room: makeRoom(2, "Second Room"), dangerScore: 3 },
    ]);
  });

  it("finds rooms by case-insensitive title substring", () => {
    const index = new RoomMemoryIndex();

    index.addRoom({ room: makeRoom(1, "Glass Choir") });
    index.addRoom({ room: makeRoom(2, "Shadow Archive") });
    index.addRoom({ room: makeRoom(3, "The Choir Below") });

    expect(index.findByTitle("CHOIR").map((record) => record.room.seed)).toEqual([1, 3]);
  });

  it("finds rooms by tag", () => {
    const index = new RoomMemoryIndex();

    index.addRoom({ room: makeRoom(1, "Glass Choir"), tags: ["safe", "echo"] });
    index.addRoom({ room: makeRoom(2, "Iron Wake"), tags: ["danger"] });
    index.addRoom({ room: makeRoom(3, "Quiet Stair"), tags: ["safe"] });

    expect(index.findByTag("safe").map((record) => record.room.name)).toEqual([
      "Glass Choir",
      "Quiet Stair",
    ]);
  });

  it("orders the most dangerous rooms by dangerScore and supports top-n", () => {
    const index = new RoomMemoryIndex();
    const records: RoomRecord[] = [
      { room: makeRoom(1, "Unscored") },
      { room: makeRoom(2, "Low"), dangerScore: 2 },
      { room: makeRoom(3, "High"), dangerScore: 10 },
      { room: makeRoom(4, "Medium"), dangerScore: 5 },
    ];

    for (const record of records) {
      index.addRoom(record);
    }

    expect(index.mostDangerous().map((record) => record.room.name)).toEqual([
      "High",
      "Medium",
      "Low",
      "Unscored",
    ]);
    expect(index.mostDangerous(2).map((record) => record.room.name)).toEqual(["High", "Medium"]);
  });

  it("returns recent rooms newest first", () => {
    const index = new RoomMemoryIndex();

    index.addRoom({ room: makeRoom(1, "First") });
    index.addRoom({ room: makeRoom(2, "Second") });
    index.addRoom({ room: makeRoom(3, "Third") });

    expect(index.recent(2).map((record) => record.room.name)).toEqual(["Third", "Second"]);
  });

  it("summarizes trail counts and last room", () => {
    const index = new RoomMemoryIndex();

    index.addRoom({ room: makeRoom(1, "First"), dangerScore: 0 });
    index.addRoom({ room: makeRoom(2, "Second"), dangerScore: 3 });
    index.addRoom({ room: makeRoom(3, "Third"), dangerScore: 8 });

    expect(index.summarizeTrail()).toBe("3 rooms · 2 dangerous · last: Third");
  });
});
