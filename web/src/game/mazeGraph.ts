import type { Cell, Maze } from "./maze";

export type CellCoord = { x: number; y: number };

type WallKey = keyof Pick<Cell, "n" | "s" | "e" | "w">;

const directions: { wall: WallKey; dx: number; dy: number }[] = [
  { wall: "n", dx: 0, dy: -1 },
  { wall: "s", dx: 0, dy: 1 },
  { wall: "e", dx: 1, dy: 0 },
  { wall: "w", dx: -1, dy: 0 },
];

function inBounds(maze: Maze, x: number, y: number): boolean {
  return x >= 0 && y >= 0 && x < maze.cols && y < maze.rows;
}

function makeDistanceGrid(maze: Maze): number[][] {
  const distances: number[][] = [];
  for (let y = 0; y < maze.rows; y++) {
    distances.push(Array.from({ length: maze.cols }, () => -1));
  }
  return distances;
}

export function connectedNeighbors(maze: Maze, x: number, y: number): CellCoord[] {
  if (!inBounds(maze, x, y)) return [];

  const cell = maze.cells[y]?.[x];
  if (!cell) return [];

  const neighbors: CellCoord[] = [];
  for (const dir of directions) {
    const nx = x + dir.dx;
    const ny = y + dir.dy;
    if (!cell[dir.wall] && inBounds(maze, nx, ny)) {
      neighbors.push({ x: nx, y: ny });
    }
  }
  return neighbors;
}

export function shortestPath(maze: Maze, from: CellCoord, to: CellCoord): CellCoord[] | null {
  if (!inBounds(maze, from.x, from.y) || !inBounds(maze, to.x, to.y)) return null;

  const queue: CellCoord[] = [from];
  const visited = makeDistanceGrid(maze);
  const previous: (CellCoord | null)[][] = [];
  for (let y = 0; y < maze.rows; y++) {
    previous.push(Array.from({ length: maze.cols }, () => null));
  }
  visited[from.y][from.x] = 0;

  for (let index = 0; index < queue.length; index++) {
    const current = queue[index];
    if (current.x === to.x && current.y === to.y) {
      const path: CellCoord[] = [];
      let step: CellCoord | null = current;
      while (step) {
        path.push(step);
        step = previous[step.y][step.x];
      }
      return path.reverse();
    }

    for (const neighbor of connectedNeighbors(maze, current.x, current.y)) {
      if (visited[neighbor.y][neighbor.x] !== -1) continue;
      visited[neighbor.y][neighbor.x] = visited[current.y][current.x] + 1;
      previous[neighbor.y][neighbor.x] = current;
      queue.push(neighbor);
    }
  }

  return null;
}

export function distanceField(maze: Maze, from: CellCoord): number[][] {
  const distances = makeDistanceGrid(maze);
  if (!inBounds(maze, from.x, from.y)) return distances;

  const queue: CellCoord[] = [from];
  distances[from.y][from.x] = 0;

  for (let index = 0; index < queue.length; index++) {
    const current = queue[index];
    for (const neighbor of connectedNeighbors(maze, current.x, current.y)) {
      if (distances[neighbor.y][neighbor.x] !== -1) continue;
      distances[neighbor.y][neighbor.x] = distances[current.y][current.x] + 1;
      queue.push(neighbor);
    }
  }

  return distances;
}

export function isFullyConnected(maze: Maze): boolean {
  if (!inBounds(maze, 0, 0)) return false;

  const distances = distanceField(maze, { x: 0, y: 0 });
  for (let y = 0; y < maze.rows; y++) {
    for (let x = 0; x < maze.cols; x++) {
      if (distances[y][x] === -1) return false;
    }
  }
  return true;
}
