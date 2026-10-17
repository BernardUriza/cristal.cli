import { describe, expect, it } from "vitest";
import { generateMaze, CELL } from "../maze";
import { MAZE_COLS, MAZE_ROWS, MAZE_SEED } from "../mazeConfig";
import {
  compactInscription,
  deformPhrase,
  inscriptionPose,
  placeInscription,
  slotKey,
  wallSlots,
  type WorldInscription,
} from "./WorldInscriptions";

const maze = generateMaze(MAZE_COLS, MAZE_ROWS, MAZE_SEED);
const alpha = { x: 3, y: 2 };

function inscription(slot: { cell: { x: number; y: number }; side: "n" | "s" | "e" | "w" }, i: number): WorldInscription {
  return { id: `i${i}`, text: `t${i}`, cell: slot.cell, side: slot.side, stance: null, source: "console", accent: "#fff", at: i };
}

describe("placeInscription", () => {
  it("puts the first phrase on a wall of the console's own cell, then spreads outward without reusing a wall", () => {
    const existing: WorldInscription[] = [];
    const keys = new Set<string>();
    for (let i = 0; i < 12; i++) {
      const slot = placeInscription(maze, alpha, existing, 100 + i);
      expect(slot).not.toBeNull();
      expect(keys.has(slotKey(slot!))).toBe(false);
      keys.add(slotKey(slot!));
      existing.push(inscription(slot!, i));
    }
    const ownWalls = wallSlots(maze, alpha).length;
    for (let i = 0; i < ownWalls; i++) expect(existing[i].cell).toEqual(alpha);
    expect(existing[ownWalls].cell).not.toEqual(alpha);
  });

  it("is deterministic for the same seed", () => {
    expect(placeInscription(maze, alpha, [], 7)).toEqual(placeInscription(maze, alpha, [], 7));
  });

  it("honours a minimum ring so a starvation fragment lands ahead, not underfoot", () => {
    const slot = placeInscription(maze, alpha, [], 3, { minRing: 1, maxRing: 2 });
    expect(slot).not.toBeNull();
    expect(slot!.cell).not.toEqual(alpha);
  });
});

describe("inscriptionPose", () => {
  it("sits flush inside the wall and faces the cell centre", () => {
    const pose = inscriptionPose(maze, { cell: alpha, side: "n" });
    const centreZ = inscriptionPose(maze, { cell: alpha, side: "s" }).position[2] - (pose.position[2] - 0) ;
    expect(pose.position[2]).toBeLessThan(centreZ);
    expect(Math.abs(inscriptionPose(maze, { cell: alpha, side: "s" }).position[2] - pose.position[2])).toBeLessThan(CELL);
    expect(inscriptionPose(maze, { cell: alpha, side: "e" }).rotationY).toBe(-Math.PI / 2);
  });
});

describe("text shaping", () => {
  it("compacts long phrases with an ellipsis", () => {
    expect(compactInscription("me siento cansado y confundido y además con frío")).toHaveLength(28);
    expect(compactInscription("es fría")).toBe("es fría");
  });

  it("deforms a phrase into fragments that keep one or two of its content words", () => {
    const out = deformPhrase("me siento cansado y confundido", 5);
    expect(out).toContain("…");
    expect(out.split(" ").filter((w) => w !== "…").length).toBeGreaterThanOrEqual(1);
    expect(out.split(" ").filter((w) => w !== "…").length).toBeLessThanOrEqual(2);
    expect(deformPhrase("frío", 1)).toBe("… frío …");
  });
});
