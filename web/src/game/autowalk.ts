import { cellCenter, type Maze } from "./maze";
import type { CellCoord } from "./mazeGraph";
import { routeToRoom } from "./MazeRouteAdvisor";
import { riteCandidateNodes } from "./riteFocus";
import type { VerticalSliceState } from "./VerticalSlice";
import type { WorldNode } from "./worldNodes";

export interface AutowalkTarget {
  cell: CellCoord;
  world: { x: number; z: number };
}

export function autowalkTarget(
  maze: Maze,
  from: CellCoord,
  slice: VerticalSliceState,
  nodes: readonly WorldNode[]
): AutowalkTarget | null {
  const candidates = riteCandidateNodes(slice, nodes);
  if (candidates.some((node) => node.cell[0] === from.x && node.cell[1] === from.y)) return null;
  const routes = candidates
    .map((node) => routeToRoom(maze, from, { x: node.cell[0], y: node.cell[1] }))
    .filter((route): route is CellCoord[] => route !== null && route.length > 1)
    .sort((a, b) => a.length - b.length);
  const next = routes[0]?.[1];
  if (!next) return null;
  const [x, z] = cellCenter(maze, next.x, next.y);
  return { cell: next, world: { x, z } };
}
