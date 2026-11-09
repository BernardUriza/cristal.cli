import { describe, expect, it } from "vitest";
import { cellCenter, generateMaze } from "./maze";
import { MAZE_COLS, MAZE_ROWS, MAZE_SEED } from "./mazeConfig";
import { WARM_RANGE, npcSessionId, npcWorldPosition, npcsToWarm } from "./npcWarmup";
import { NPC_NODES } from "./worldNodes";

const velador = NPC_NODES[0];

describe("npcWarmup", () => {
  it("places an inhabitant exactly where the scene draws them", () => {
    const maze = generateMaze(MAZE_COLS, MAZE_ROWS, MAZE_SEED);
    const [x, z] = cellCenter(maze, velador.cell[0], velador.cell[1]);
    expect(npcWorldPosition(velador)).toEqual({ x, z });
  });

  it("opens the session while the player is still walking up, and only once", () => {
    const at = npcWorldPosition(velador);
    expect(npcsToWarm({ x: at.x - WARM_RANGE - 1, z: at.z }, NPC_NODES, new Set())).toEqual([]);
    expect(npcsToWarm({ x: at.x - WARM_RANGE + 1, z: at.z }, NPC_NODES, new Set())).toEqual([velador]);
    expect(npcsToWarm(at, NPC_NODES, new Set([velador.id]))).toEqual([]);
  });

  it("gives each inhabitant their own thread inside the player's session", () => {
    expect(npcSessionId("FRACTURE_00", "npc_velador")).toBe("FRACTURE_00-npc_velador");
  });
});
