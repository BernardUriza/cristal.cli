import type { Maze } from "../../game/maze";
import type { CellCoord } from "../../game/mazeGraph";
import { cellKey, nearestUnvisited, routeToRoom } from "../../game/MazeRouteAdvisor";
import type { WorldNode } from "../../game/worldNodes";

export interface MinimapRoute {
  route: CellCoord[] | null;
  targetNode: WorldNode | null;
  isRiteTarget: boolean;
}

export function withVisited(visited: ReadonlySet<string>, cell: CellCoord): ReadonlySet<string> {
  const key = cellKey(cell);
  return visited.has(key) ? visited : new Set([...visited, key]);
}

export function nodeVisited(visited: ReadonlySet<string>, node: WorldNode): boolean {
  return visited.has(cellKey({ x: node.cell[0], y: node.cell[1] }));
}

function shortestRouteTo(maze: Maze, from: CellCoord, nodes: readonly WorldNode[]) {
  let best: { node: WorldNode; route: CellCoord[] } | null = null;
  for (const node of nodes) {
    const route = routeToRoom(maze, from, { x: node.cell[0], y: node.cell[1] });
    if (route && (!best || route.length < best.route.length)) best = { node, route };
  }
  return best;
}

export function planMinimapRoute(
  maze: Maze,
  from: CellCoord,
  riteNodes: readonly WorldNode[],
  worldNodes: readonly WorldNode[],
  visited: ReadonlySet<string>
): MinimapRoute {
  const riteHit = shortestRouteTo(maze, from, riteNodes);
  if (riteHit) return { route: riteHit.route, targetNode: riteHit.node, isRiteTarget: true };

  const nodeHit = shortestRouteTo(maze, from, worldNodes.filter((node) => !nodeVisited(visited, node)));
  if (nodeHit) return { route: nodeHit.route, targetNode: nodeHit.node, isRiteTarget: false };

  const target = nearestUnvisited(maze, from, visited);
  return { route: target ? routeToRoom(maze, from, target) : null, targetNode: null, isRiteTarget: false };
}
