// Deterministic maze generation (recursive backtracker) so the labyrinth is
// stable across reloads without needing a saved .unity scene. Cells are square;
// a wall lives on the boundary between two cells.

export const CELL = 4; // world units per maze cell
export const WALL_HEIGHT = 3.5;
export const WALL_THICK = 0.4;

export interface Cell {
  x: number;
  y: number;
  // walls present on each side
  n: boolean;
  s: boolean;
  e: boolean;
  w: boolean;
  visited: boolean;
}

export interface Maze {
  cols: number;
  rows: number;
  cells: Cell[][];
}

// Small deterministic PRNG (mulberry32) so a fixed seed => fixed labyrinth.
function mulberry32(seed: number) {
  let a = seed >>> 0;
  return () => {
    a |= 0;
    a = (a + 0x6d2b79f5) | 0;
    let t = Math.imul(a ^ (a >>> 15), 1 | a);
    t = (t + Math.imul(t ^ (t >>> 7), 61 | t)) ^ t;
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  };
}

export function generateMaze(cols: number, rows: number, seed = 1337): Maze {
  const rng = mulberry32(seed);
  const cells: Cell[][] = [];
  for (let y = 0; y < rows; y++) {
    const row: Cell[] = [];
    for (let x = 0; x < cols; x++) {
      row.push({ x, y, n: true, s: true, e: true, w: true, visited: false });
    }
    cells.push(row);
  }

  const stack: Cell[] = [];
  let current = cells[0][0];
  current.visited = true;
  let unvisited = cols * rows - 1;

  while (unvisited > 0) {
    const neighbors: { cell: Cell; dir: keyof Pick<Cell, "n" | "s" | "e" | "w"> }[] = [];
    const { x, y } = current;
    if (y > 0 && !cells[y - 1][x].visited) neighbors.push({ cell: cells[y - 1][x], dir: "n" });
    if (y < rows - 1 && !cells[y + 1][x].visited) neighbors.push({ cell: cells[y + 1][x], dir: "s" });
    if (x < cols - 1 && !cells[y][x + 1].visited) neighbors.push({ cell: cells[y][x + 1], dir: "e" });
    if (x > 0 && !cells[y][x - 1].visited) neighbors.push({ cell: cells[y][x - 1], dir: "w" });

    if (neighbors.length > 0) {
      const pick = neighbors[Math.floor(rng() * neighbors.length)];
      // knock down the wall between current and the chosen neighbor
      switch (pick.dir) {
        case "n": current.n = false; pick.cell.s = false; break;
        case "s": current.s = false; pick.cell.n = false; break;
        case "e": current.e = false; pick.cell.w = false; break;
        case "w": current.w = false; pick.cell.e = false; break;
      }
      stack.push(current);
      current = pick.cell;
      current.visited = true;
      unvisited--;
    } else if (stack.length > 0) {
      current = stack.pop()!;
    } else {
      break;
    }
  }

  return { cols, rows, cells };
}

// World-space center of a cell (maze centered on origin).
export function cellCenter(maze: Maze, cx: number, cy: number): [number, number] {
  const offsetX = (maze.cols * CELL) / 2 - CELL / 2;
  const offsetZ = (maze.rows * CELL) / 2 - CELL / 2;
  return [cx * CELL - offsetX, cy * CELL - offsetZ];
}

// Returns true if a circle of `radius` centered at world (wx, wz) is clear of
// walls. Used by the player controller for collision against the maze.
export function isWalkable(maze: Maze, wx: number, wz: number, radius: number): boolean {
  const offsetX = (maze.cols * CELL) / 2 - CELL / 2;
  const offsetZ = (maze.rows * CELL) / 2 - CELL / 2;
  const fx = (wx + offsetX) / CELL; // fractional cell coords
  const fz = (wz + offsetZ) / CELL;
  const cx = Math.round(fx);
  const cy = Math.round(fz);

  if (cx < 0 || cy < 0 || cx >= maze.cols || cy >= maze.rows) return false;
  const cell = maze.cells[cy][cx];

  const r = radius / CELL;
  const dx = fx - cx; // -0.5..0.5 within cell
  const dz = fz - cy;

  // Block if we're pushing into a walled side past the radius margin.
  if (cell.e && dx > 0.5 - r) return false;
  if (cell.w && dx < -0.5 + r) return false;
  if (cell.s && dz > 0.5 - r) return false;
  if (cell.n && dz < -0.5 + r) return false;
  return true;
}
