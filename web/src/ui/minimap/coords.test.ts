import { describe, expect, it } from "vitest";
import { CELL } from "../../game/maze";
import { MAZE_COLS, MAZE_ROWS } from "../../game/mazeConfig";
import { CELL_PX, center, poseCell, poseMarker } from "./coords";

const worldOf = (cx: number, cy: number) => ({
  x: cx * CELL - ((MAZE_COLS * CELL) / 2 - CELL / 2),
  z: cy * CELL - ((MAZE_ROWS * CELL) / 2 - CELL / 2),
});

describe("minimap coords", () => {
  it("maps a cell's world center back to that cell and to its pixel center", () => {
    const pose = { ...worldOf(3, 5), heading: 0 };
    expect(poseCell(pose)).toEqual({ x: 3, y: 5 });
    const marker = poseMarker(pose);
    expect(marker.dotX).toBeCloseTo(center(3));
    expect(marker.dotZ).toBeCloseTo(center(5));
    expect(marker.headZ - marker.dotZ).toBeCloseTo(CELL_PX * 0.6);
  });

  it("clamps poses outside the maze to the border cells", () => {
    expect(poseCell({ x: -1000, z: 1000, heading: 0 })).toEqual({ x: 0, y: MAZE_ROWS - 1 });
  });

  it("points the heading tick along sin/cos of the yaw", () => {
    const marker = poseMarker({ ...worldOf(0, 0), heading: Math.PI / 2 });
    expect(marker.headX - marker.dotX).toBeCloseTo(CELL_PX * 0.6);
    expect(marker.headZ - marker.dotZ).toBeCloseTo(0);
  });
});
