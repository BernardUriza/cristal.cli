import { useEffect } from "react";
import { generateMaze, cellAt } from "./maze";
import { MAZE_COLS, MAZE_ROWS, MAZE_SEED } from "./mazeConfig";
import { subscribePlayerPose } from "./playerPositionBus";
import { useGame } from "./store";
import { GameMode } from "./types";
import { WORLD_NODES } from "./worldNodes";

const SAMPLE_MS = 400;
const NEAR_CELLS = 1;

function near(a: { x: number; y: number }, b: readonly [number, number] | { x: number; y: number }): boolean {
  const bx = Array.isArray(b) ? b[0] : (b as { x: number }).x;
  const by = Array.isArray(b) ? b[1] : (b as { y: number }).y;
  return Math.abs(a.x - bx) + Math.abs(a.y - by) <= NEAR_CELLS;
}

export function useDiscoveryClock(): void {
  const exploring = useGame((s) => s.mode === GameMode.Exploration);
  useEffect(() => {
    if (!exploring) return;
    const maze = generateMaze(MAZE_COLS, MAZE_ROWS, MAZE_SEED);
    let sampledAt = 0;
    return subscribePlayerPose((pose) => {
      const now = Date.now();
      if (now - sampledAt < SAMPLE_MS) return;
      sampledAt = now;
      const cell = cellAt(maze, pose.x, pose.z);
      const game = useGame.getState();
      for (const node of WORLD_NODES) if (near(cell, node.cell)) game.noteDiscovery("node", node.id, now);
      for (const item of game.inscriptions) if (near(cell, item.cell)) game.noteDiscovery("inscription", item.id, now);
      game.relieveStarvation(cell, now);
    });
  }, [exploring]);
}
