import type { Maze } from "./maze";
import { type CellCoord, connectedNeighbors, shortestPath } from "./mazeGraph";

export function cellKey(c: CellCoord): string {
  return `${c.x},${c.y}`;
}

function inBounds(maze: Maze, c: CellCoord): boolean {
  return c.x >= 0 && c.y >= 0 && c.x < maze.cols && c.y < maze.rows && Boolean(maze.cells[c.y]?.[c.x]);
}

function reconstructPath(previous: (CellCoord | null)[][], to: CellCoord): CellCoord[] {
  const path: CellCoord[] = [];
  let step: CellCoord | null = to;

  while (step) {
    path.push(step);
    step = previous[step.y][step.x];
  }

  return path.reverse();
}

export function nearestUnvisited(
  maze: Maze,
  from: CellCoord,
  visited: ReadonlySet<string>,
): CellCoord | null {
  if (!inBounds(maze, from)) return null;

  const queue: CellCoord[] = [from];
  const seen = new Set<string>([cellKey(from)]);

  for (let index = 0; index < queue.length; index++) {
    const current = queue[index];
    if (!visited.has(cellKey(current))) return current;

    for (const neighbor of connectedNeighbors(maze, current.x, current.y)) {
      const key = cellKey(neighbor);
      if (seen.has(key)) continue;

      seen.add(key);
      queue.push(neighbor);
    }
  }

  return null;
}

export function routeToRoom(maze: Maze, from: CellCoord, to: CellCoord): CellCoord[] | null {
  return shortestPath(maze, from, to);
}

export function dangerWeightedPath(
  maze: Maze,
  from: CellCoord,
  to: CellCoord,
  dangerous: ReadonlySet<string>,
  dangerCost = 5,
): CellCoord[] | null {
  if (!inBounds(maze, from) || !inBounds(maze, to)) return null;

  const distances: number[][] = [];
  const previous: (CellCoord | null)[][] = [];
  const unsettled: CellCoord[] = [from];

  for (let y = 0; y < maze.rows; y++) {
    distances.push(Array.from({ length: maze.cols }, () => Number.POSITIVE_INFINITY));
    previous.push(Array.from({ length: maze.cols }, () => null));
  }

  distances[from.y][from.x] = 0;

  for (let index = 0; index < unsettled.length; index++) {
    let bestIndex = index;
    for (let scan = index + 1; scan < unsettled.length; scan++) {
      const best = unsettled[bestIndex];
      const candidate = unsettled[scan];
      if (distances[candidate.y][candidate.x] < distances[best.y][best.x]) {
        bestIndex = scan;
      }
    }

    const current = unsettled[bestIndex];
    unsettled[bestIndex] = unsettled[index];
    unsettled[index] = current;

    if (current.x === to.x && current.y === to.y) {
      return reconstructPath(previous, to);
    }

    for (const neighbor of connectedNeighbors(maze, current.x, current.y)) {
      const stepCost = dangerous.has(cellKey(neighbor)) ? dangerCost : 1;
      const nextDistance = distances[current.y][current.x] + stepCost;
      if (nextDistance >= distances[neighbor.y][neighbor.x]) continue;

      distances[neighbor.y][neighbor.x] = nextDistance;
      previous[neighbor.y][neighbor.x] = current;
      unsettled.push(neighbor);
    }
  }

  return null;
}
