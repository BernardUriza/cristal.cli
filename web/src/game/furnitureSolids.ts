import { BACKROOM_FURNITURE } from "./backroomFurniture";
import type { BackroomFurniturePlacement } from "./BackroomFurniturePlacer";
import { cellCenter, type Maze } from "./maze";
import type { Pillar } from "./player/collision";

const FURNITURE_RADIUS = 0.55;
// A console stands mid-corridor, so it stays slim enough to walk past on either side; an inhabitant has a body.
export const CONSOLE_RADIUS = 0.3;
export const NPC_RADIUS = 0.55;
const FLOOR_KINDS: ReadonlySet<string> = new Set(
  BACKROOM_FURNITURE.filter((item) => item.mount === "floor").map((item) => item.kind)
);

// Floor pieces pushed against a wall stand in the way; what lies flat in the middle of a cell is walked over.
export function furnitureSolids(maze: Maze, placements: readonly BackroomFurniturePlacement[]): Pillar[] {
  return placements
    .filter((item) => {
      if (!FLOOR_KINDS.has(item.kind)) return false;
      const [cx, cz] = cellCenter(maze, item.cell[0], item.cell[1]);
      return Math.hypot(item.position[0] - cx, item.position[2] - cz) > 0.01;
    })
    .map((item) => ({ x: item.position[0], z: item.position[2], radius: FURNITURE_RADIUS }));
}
