import { describe, expect, it } from "vitest";
import { autowalkTarget } from "./autowalk";
import { generateMaze } from "./maze";
import { MAZE_COLS, MAZE_ROWS, MAZE_SEED, SPAWN_CELL } from "./mazeConfig";
import { INITIAL_VERTICAL_SLICE } from "./VerticalSlice";
import { WORLD_NODES } from "./worldNodes";
import { routeToRoom } from "./MazeRouteAdvisor";

const maze = generateMaze(MAZE_COLS, MAZE_ROWS, MAZE_SEED);

describe("autowalkTarget", () => {
  it("points at the next cell of the shortest route to a console while the rite wants a console", () => {
    const target = autowalkTarget(maze, SPAWN_CELL, INITIAL_VERTICAL_SLICE, WORLD_NODES);
    expect(target).not.toBeNull();
    const alpha = routeToRoom(maze, SPAWN_CELL, { x: 3, y: 2 })!;
    expect(target!.cell).toEqual(alpha[1]);
  });

  it("returns null when the player already stands on the target", () => {
    expect(autowalkTarget(maze, { x: 3, y: 2 }, INITIAL_VERTICAL_SLICE, WORLD_NODES)).toBeNull();
  });
});
