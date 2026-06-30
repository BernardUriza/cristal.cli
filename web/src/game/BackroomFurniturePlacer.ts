import { BACKROOM_FURNITURE, type BackroomFurnitureKind } from "./backroomFurniture";
import { CELL, cellCenter, type Cell, type Maze } from "./maze";

export interface FurnitureBlockedCell {
  x: number;
  y: number;
}

export interface BackroomFurniturePlacement {
  id: string;
  kind: BackroomFurnitureKind;
  cell: readonly [number, number];
  position: [number, number, number];
  rotationY: number;
}

type WallDirection = "n" | "s" | "e" | "w";

interface PlacementCandidate {
  x: number;
  y: number;
  wall: WallDirection;
  score: number;
}

const WALL_ROTATION: Record<WallDirection, number> = {
  n: 0,
  e: Math.PI / 2,
  s: Math.PI,
  w: -Math.PI / 2,
};

const WALL_OFFSET: Record<WallDirection, readonly [number, number]> = {
  n: [0, -CELL * 0.36],
  e: [CELL * 0.36, 0],
  s: [0, CELL * 0.36],
  w: [-CELL * 0.36, 0],
};

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

function cellKey(x: number, y: number): string {
  return `${x},${y}`;
}

function wallCount(cell: Cell): number {
  return Number(cell.n) + Number(cell.s) + Number(cell.e) + Number(cell.w);
}

function wallDirections(cell: Cell): WallDirection[] {
  const directions: WallDirection[] = [];
  if (cell.n) directions.push("n");
  if (cell.e) directions.push("e");
  if (cell.s) directions.push("s");
  if (cell.w) directions.push("w");
  return directions;
}

function shuffled<T>(items: readonly T[], rng: () => number): T[] {
  const copy = [...items];
  for (let i = copy.length - 1; i > 0; i--) {
    const j = Math.floor(rng() * (i + 1));
    [copy[i], copy[j]] = [copy[j], copy[i]];
  }
  return copy;
}

function buildCandidates(maze: Maze, blocked: ReadonlySet<string>, rng: () => number): PlacementCandidate[] {
  const candidates: PlacementCandidate[] = [];

  for (let y = 0; y < maze.rows; y++) {
    for (let x = 0; x < maze.cols; x++) {
      if (blocked.has(cellKey(x, y))) continue;
      const cell = maze.cells[y]?.[x];
      if (!cell) continue;

      for (const wall of wallDirections(cell)) {
        candidates.push({
          x,
          y,
          wall,
          score: wallCount(cell) * 10 + rng(),
        });
      }
    }
  }

  return candidates.sort((a, b) => b.score - a.score || a.y - b.y || a.x - b.x);
}

function placementFromCandidate(
  maze: Maze,
  kind: BackroomFurnitureKind,
  index: number,
  candidate: PlacementCandidate
): BackroomFurniturePlacement {
  const [cx, cz] = cellCenter(maze, candidate.x, candidate.y);
  const centeredKinds = new Set<BackroomFurnitureKind>([
    "fluorescent_ceiling_light",
    "floor_vent",
    "wet_carpet_patch",
    "exposed_pipes",
  ]);
  const [ox, oz] = centeredKinds.has(kind) ? [0, 0] : WALL_OFFSET[candidate.wall];

  return {
    id: `backroom_furniture_${index}_${kind}`,
    kind,
    cell: [candidate.x, candidate.y],
    position: [cx + ox, 0, cz + oz],
    rotationY: WALL_ROTATION[candidate.wall],
  };
}

export function placeBackroomFurniture(
  maze: Maze,
  seed: number,
  blockedCells: readonly FurnitureBlockedCell[] = []
): BackroomFurniturePlacement[] {
  const rng = mulberry32(seed ^ 0x6b6f6f6d);
  const blocked = new Set(blockedCells.map((cell) => cellKey(cell.x, cell.y)));
  const reserved = new Set<string>(blocked);
  const candidates = buildCandidates(maze, blocked, rng);
  const placements: BackroomFurniturePlacement[] = [];

  for (const definition of BACKROOM_FURNITURE) {
    const candidate = candidates.find((item) => !reserved.has(cellKey(item.x, item.y)));
    if (!candidate) break;

    placements.push(placementFromCandidate(maze, definition.kind, placements.length, candidate));
    reserved.add(cellKey(candidate.x, candidate.y));
  }

  const remainingCandidates = shuffled(
    candidates.filter((item) => !reserved.has(cellKey(item.x, item.y))),
    rng
  );
  const fillCount = Math.min(12, remainingCandidates.length);

  for (let i = 0; i < fillCount; i++) {
    const definition = BACKROOM_FURNITURE[Math.floor(rng() * BACKROOM_FURNITURE.length)];
    const candidate = remainingCandidates[i];
    placements.push(placementFromCandidate(maze, definition.kind, placements.length, candidate));
    reserved.add(cellKey(candidate.x, candidate.y));
  }

  return placements;
}
