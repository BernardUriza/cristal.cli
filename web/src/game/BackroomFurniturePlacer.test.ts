import { describe, expect, it } from "vitest";
import { BACKROOM_FURNITURE_KINDS } from "./backroomFurniture";
import { placeBackroomFurniture } from "./BackroomFurniturePlacer";
import { generateMaze } from "./maze";
import { MAZE_COLS, MAZE_ROWS, MAZE_SEED, SPAWN_CELL } from "./mazeConfig";
import { WORLD_NODES } from "./worldNodes";

function productionPlacements() {
  const maze = generateMaze(MAZE_COLS, MAZE_ROWS, MAZE_SEED);
  const blocked = [
    SPAWN_CELL,
    ...WORLD_NODES.map((node) => ({ x: node.cell[0], y: node.cell[1] })),
  ];
  return placeBackroomFurniture(maze, MAZE_SEED, blocked);
}

describe("BackroomFurniturePlacer", () => {
  it("places every registered furniture kind in the production maze", () => {
    const placedKinds = new Set(productionPlacements().map((placement) => placement.kind));

    expect(placedKinds).toEqual(new Set(BACKROOM_FURNITURE_KINDS));
  });

  it("is deterministic for the same maze seed and blocked cells", () => {
    expect(productionPlacements()).toEqual(productionPlacements());
  });
});
