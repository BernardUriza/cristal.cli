import { CELL, WALL_HEIGHT, WALL_THICK, cellCenter, type Maze } from "./maze";

export interface WallSpec {
  position: [number, number, number];
  size: [number, number, number];
}

// One box per wall: only N/W per cell plus the far S/E border, so shared edges are never doubled.
export function buildWalls(maze: Maze): WallSpec[] {
  const walls: WallSpec[] = [];
  for (let y = 0; y < maze.rows; y++) {
    for (let x = 0; x < maze.cols; x++) {
      const cell = maze.cells[y][x];
      const [cx, cz] = cellCenter(maze, x, y);
      if (cell.n) {
        walls.push({
          position: [cx, WALL_HEIGHT / 2, cz - CELL / 2],
          size: [CELL + WALL_THICK, WALL_HEIGHT, WALL_THICK],
        });
      }
      if (cell.w) {
        walls.push({
          position: [cx - CELL / 2, WALL_HEIGHT / 2, cz],
          size: [WALL_THICK, WALL_HEIGHT, CELL + WALL_THICK],
        });
      }
      if (y === maze.rows - 1 && cell.s) {
        walls.push({
          position: [cx, WALL_HEIGHT / 2, cz + CELL / 2],
          size: [CELL + WALL_THICK, WALL_HEIGHT, WALL_THICK],
        });
      }
      if (x === maze.cols - 1 && cell.e) {
        walls.push({
          position: [cx + CELL / 2, WALL_HEIGHT / 2, cz],
          size: [WALL_THICK, WALL_HEIGHT, CELL + WALL_THICK],
        });
      }
    }
  }
  return walls;
}
