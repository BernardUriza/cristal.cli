import { CELL } from "./maze";
import { MAZE_COLS, MAZE_ROWS } from "./mazeConfig";
import type { NpcNode } from "./worldNodes";

/** about two cells: far enough that the session is open by the time the player has read the greeting */
export const WARM_RANGE = CELL * 2.5;

export function npcSessionId(coreSessionId: string, npcId: string): string {
  return `${coreSessionId}-${npcId}`;
}

export function npcWorldPosition(npc: NpcNode): { x: number; z: number } {
  return {
    x: npc.cell[0] * CELL - ((MAZE_COLS - 1) * CELL) / 2,
    z: npc.cell[1] * CELL - ((MAZE_ROWS - 1) * CELL) / 2,
  };
}

/** inhabitants the player is walking towards whose session has not been opened yet */
export function npcsToWarm(
  pose: { x: number; z: number },
  npcs: readonly NpcNode[],
  warmed: ReadonlySet<string>,
  range: number = WARM_RANGE
): NpcNode[] {
  return npcs.filter((npc) => {
    if (warmed.has(npc.id)) return false;
    const at = npcWorldPosition(npc);
    return Math.hypot(at.x - pose.x, at.z - pose.z) <= range;
  });
}
