import { describe, expect, it } from "vitest";
import * as THREE from "three";
import { placeBackroomFurniture } from "./BackroomFurniturePlacer";
import { furnitureSolids } from "./furnitureSolids";
import { cellCenter, generateMaze } from "./maze";
import { MAZE_COLS, MAZE_ROWS, MAZE_SEED } from "./mazeConfig";
import { PLAYER_RADIUS, stepTowards } from "./player/movement";

const maze = generateMaze(MAZE_COLS, MAZE_ROWS, MAZE_SEED);
const placements = placeBackroomFurniture(maze, MAZE_SEED);
const solids = furnitureSolids(maze, placements);

describe("furnitureSolids", () => {
  it("makes wall-side floor pieces solid and leaves vents, carpets and lamps alone", () => {
    expect(solids.length).toBeGreaterThan(0);
    expect(solids.length).toBeLessThan(placements.length);
    const flat = placements.filter((item) => ["floor_vent", "wet_carpet_patch", "fluorescent_ceiling_light"].includes(item.kind));
    for (const item of flat) {
      expect(solids.some((solid) => solid.x === item.position[0] && solid.z === item.position[2])).toBe(false);
    }
  });

  it("never seals a cell: the player still walks from centre to centre past every piece", () => {
    for (const item of placements) {
      const [cx, cz] = cellCenter(maze, item.cell[0], item.cell[1]);
      const cell = maze.cells[item.cell[1]][item.cell[0]];
      const exits: [number, number][] = [];
      if (!cell.n) exits.push([item.cell[0], item.cell[1] - 1]);
      if (!cell.s) exits.push([item.cell[0], item.cell[1] + 1]);
      if (!cell.e) exits.push([item.cell[0] + 1, item.cell[1]]);
      if (!cell.w) exits.push([item.cell[0] - 1, item.cell[1]]);
      for (const [nx, ny] of exits) {
        const [tx, tz] = cellCenter(maze, nx, ny);
        const pos = new THREE.Vector3(tx, 0, tz);
        for (let frame = 0; frame < 600; frame++) stepTowards(maze, pos, { x: cx, z: cz }, 4, 1 / 60, solids);
        expect(Math.hypot(pos.x - cx, pos.z - cz)).toBeLessThan(PLAYER_RADIUS);
      }
    }
  });
});
