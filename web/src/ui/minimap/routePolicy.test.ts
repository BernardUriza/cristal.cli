import { describe, expect, it } from "vitest";
import { generateMaze } from "../../game/maze";
import { cellKey } from "../../game/MazeRouteAdvisor";
import { MAZE_COLS, MAZE_ROWS, MAZE_SEED, SPAWN_CELL } from "../../game/mazeConfig";
import { WORLD_NODES } from "../../game/worldNodes";
import { nodeVisited, planMinimapRoute, withVisited } from "./routePolicy";

const maze = generateMaze(MAZE_COLS, MAZE_ROWS, MAZE_SEED);
const allCells = new Set(maze.cells.flatMap((row, y) => row.map((_, x) => cellKey({ x, y }))));

describe("withVisited", () => {
  it("returns the same set when the cell was already seen and a new one otherwise, never mutating", () => {
    const first = withVisited(new Set(), { x: 1, y: 2 });
    expect(withVisited(first, { x: 1, y: 2 })).toBe(first);
    const second = withVisited(first, { x: 2, y: 2 });
    expect(second).not.toBe(first);
    expect([...first]).toEqual(["1,2"]);
    expect([...second]).toEqual(["1,2", "2,2"]);
  });
});

describe("planMinimapRoute", () => {
  it("prefers a rite target even when it was already visited", () => {
    const rite = WORLD_NODES[0];
    const plan = planMinimapRoute(maze, SPAWN_CELL, [rite], WORLD_NODES, allCells);
    expect(plan.isRiteTarget).toBe(true);
    expect(plan.targetNode?.id).toBe(rite.id);
    expect(plan.route?.[plan.route.length - 1]).toEqual({ x: rite.cell[0], y: rite.cell[1] });
  });

  it("routes to the nearest unvisited node, skipping visited ones", () => {
    const plan = planMinimapRoute(maze, SPAWN_CELL, [], WORLD_NODES, new Set());
    const visitedNearest = withVisited(new Set(), { x: plan.targetNode!.cell[0], y: plan.targetNode!.cell[1] });
    const next = planMinimapRoute(maze, SPAWN_CELL, [], WORLD_NODES, visitedNearest);
    expect(next.targetNode?.id).not.toBe(plan.targetNode?.id);
    expect(nodeVisited(visitedNearest, next.targetNode!)).toBe(false);
    expect(next.route!.length).toBeGreaterThanOrEqual(plan.route!.length);
  });

  it("falls back to the nearest unvisited cell and then to nothing", () => {
    const nodeCells = WORLD_NODES.reduce<ReadonlySet<string>>((set, n) => withVisited(set, { x: n.cell[0], y: n.cell[1] }), new Set([cellKey(SPAWN_CELL)]));
    const cellPlan = planMinimapRoute(maze, SPAWN_CELL, [], WORLD_NODES, nodeCells);
    expect(cellPlan.targetNode).toBeNull();
    expect(cellPlan.route!.length).toBeGreaterThan(1);
    expect(planMinimapRoute(maze, SPAWN_CELL, [], WORLD_NODES, allCells)).toEqual({ route: null, targetNode: null, isRiteTarget: false });
  });
});
