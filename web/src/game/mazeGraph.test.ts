import { describe, expect, it } from "vitest";
import { generateMaze, type Cell, type Maze } from "./maze";
import { connectedNeighbors, distanceField, isFullyConnected, shortestPath } from "./mazeGraph";

function makeCell(x: number, y: number): Cell {
  return { x, y, n: true, s: true, e: true, w: true, visited: false };
}

function makeTinyMaze(): Maze {
  const cells: Cell[][] = [
    [makeCell(0, 0), makeCell(1, 0), makeCell(2, 0)],
    [makeCell(0, 1), makeCell(1, 1), makeCell(2, 1)],
  ];

  cells[0][0].e = false;
  cells[0][1].w = false;

  cells[0][1].e = false;
  cells[0][2].w = false;

  cells[0][2].s = false;
  cells[1][2].n = false;

  cells[1][2].w = false;
  cells[1][1].e = false;

  return { cols: 3, rows: 2, cells };
}

describe("mazeGraph", () => {
  it("finds connected neighbors through knocked-down in-bounds walls", () => {
    const maze = makeTinyMaze();

    expect(connectedNeighbors(maze, 1, 0)).toEqual([
      { x: 2, y: 0 },
      { x: 0, y: 0 },
    ]);
    expect(connectedNeighbors(maze, 0, 1)).toEqual([]);
    expect(connectedNeighbors(maze, -1, 0)).toEqual([]);
  });

  it("finds the unique shortest path and is symmetric in length", () => {
    const maze = makeTinyMaze();

    const forward = shortestPath(maze, { x: 0, y: 0 }, { x: 1, y: 1 });
    const backward = shortestPath(maze, { x: 1, y: 1 }, { x: 0, y: 0 });

    expect(forward).toEqual([
      { x: 0, y: 0 },
      { x: 1, y: 0 },
      { x: 2, y: 0 },
      { x: 2, y: 1 },
      { x: 1, y: 1 },
    ]);
    expect(backward?.length).toBe(forward?.length);
  });

  it("returns null when blocked or out of bounds", () => {
    const maze = makeTinyMaze();

    expect(shortestPath(maze, { x: 0, y: 0 }, { x: 0, y: 1 })).toBeNull();
    expect(shortestPath(maze, { x: -1, y: 0 }, { x: 0, y: 0 })).toBeNull();
    expect(shortestPath(maze, { x: 0, y: 0 }, { x: 3, y: 0 })).toBeNull();
  });

  it("builds a distance field with step counts from the source", () => {
    const maze = makeTinyMaze();

    expect(distanceField(maze, { x: 0, y: 0 })).toEqual([
      [0, 1, 2],
      [-1, 4, 3],
    ]);
    expect(distanceField(maze, { x: 99, y: 0 })).toEqual([
      [-1, -1, -1],
      [-1, -1, -1],
    ]);
  });

  it("reports generated mazes as fully connected", () => {
    const maze = generateMaze(8, 6, 2026);

    expect(isFullyConnected(maze)).toBe(true);
  });
});
