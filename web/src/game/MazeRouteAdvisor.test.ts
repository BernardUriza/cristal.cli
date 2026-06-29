import { describe, it, expect } from "vitest";
import { generateMaze, type Cell, type Maze } from "./maze";
import { shortestPath } from "./mazeGraph";
import { cellKey, dangerWeightedPath, nearestUnvisited, routeToRoom } from "./MazeRouteAdvisor";

function makeCell(x: number, y: number): Cell {
  return { x, y, n: true, s: true, e: true, w: true, visited: false };
}

function openEastWest(cells: Cell[][], x: number, y: number): void {
  cells[y][x].e = false;
  cells[y][x + 1].w = false;
}

function openNorthSouth(cells: Cell[][], x: number, y: number): void {
  cells[y][x].s = false;
  cells[y + 1][x].n = false;
}

function makeGridMaze(cols: number, rows: number): Maze {
  const cells: Cell[][] = [];
  for (let y = 0; y < rows; y++) {
    const row: Cell[] = [];
    for (let x = 0; x < cols; x++) {
      row.push(makeCell(x, y));
    }
    cells.push(row);
  }

  return { cols, rows, cells };
}

function makeDetourMaze(): Maze {
  const maze = makeGridMaze(3, 2);
  const { cells } = maze;

  openEastWest(cells, 0, 0);
  openEastWest(cells, 1, 0);
  openNorthSouth(cells, 0, 0);
  openEastWest(cells, 0, 1);
  openEastWest(cells, 1, 1);
  openNorthSouth(cells, 2, 0);

  return maze;
}

describe("MazeRouteAdvisor", () => {
  it("finds the closest reachable unvisited cell", () => {
    const maze = makeDetourMaze();
    const visited = new Set(["0,0", "1,0"]);

    expect(nearestUnvisited(maze, { x: 0, y: 0 }, visited)).toEqual({ x: 0, y: 1 });
  });

  it("routes to a room by delegating to shortestPath", () => {
    const maze = generateMaze(6, 5, 2026);
    const from = { x: 0, y: 0 };
    const to = { x: 5, y: 4 };

    expect(routeToRoom(maze, from, to)).toEqual(shortestPath(maze, from, to));
  });

  it("avoids a dangerous cell when a clear detour exists", () => {
    const maze = makeDetourMaze();
    const path = dangerWeightedPath(maze, { x: 0, y: 0 }, { x: 2, y: 0 }, new Set(["1,0"]));

    expect(path).toEqual([
      { x: 0, y: 0 },
      { x: 0, y: 1 },
      { x: 1, y: 1 },
      { x: 2, y: 1 },
      { x: 2, y: 0 },
    ]);
    expect(path?.some((cell) => cellKey(cell) === "1,0")).toBe(false);
  });

  it("routes through danger when it is the only path", () => {
    const maze = makeGridMaze(3, 1);
    openEastWest(maze.cells, 0, 0);
    openEastWest(maze.cells, 1, 0);

    expect(dangerWeightedPath(maze, { x: 0, y: 0 }, { x: 2, y: 0 }, new Set(["1,0"]))).toEqual([
      { x: 0, y: 0 },
      { x: 1, y: 0 },
      { x: 2, y: 0 },
    ]);
  });

  it("returns null for out-of-bounds inputs", () => {
    const maze = makeDetourMaze();

    expect(nearestUnvisited(maze, { x: -1, y: 0 }, new Set())).toBeNull();
    expect(routeToRoom(maze, { x: 0, y: 0 }, { x: 3, y: 0 })).toBeNull();
    expect(dangerWeightedPath(maze, { x: 0, y: 2 }, { x: 2, y: 0 }, new Set())).toBeNull();
    expect(dangerWeightedPath(maze, { x: 0, y: 0 }, { x: 2, y: -1 }, new Set())).toBeNull();
  });
});
