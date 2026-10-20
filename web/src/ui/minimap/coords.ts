import { CELL } from "../../game/maze";
import { MAZE_COLS, MAZE_ROWS } from "../../game/mazeConfig";
import type { CellCoord } from "../../game/mazeGraph";
import type { PlayerPose } from "../../game/playerPositionBus";
import { clamp } from "../../shared/math";

export const CELL_PX = 18;
export const MAP_WIDTH = MAZE_COLS * CELL_PX;
export const MAP_HEIGHT = MAZE_ROWS * CELL_PX;

const OFFSET_X = (MAZE_COLS * CELL) / 2 - CELL / 2;
const OFFSET_Z = (MAZE_ROWS * CELL) / 2 - CELL / 2;

export const center = (c: number) => c * CELL_PX + CELL_PX / 2;

export function poseCell(pose: PlayerPose): CellCoord {
  return {
    x: clamp(Math.round((pose.x + OFFSET_X) / CELL), 0, MAZE_COLS - 1),
    y: clamp(Math.round((pose.z + OFFSET_Z) / CELL), 0, MAZE_ROWS - 1),
  };
}

export interface PoseMarker {
  dotX: number;
  dotZ: number;
  headX: number;
  headZ: number;
}

export function poseMarker(pose: PlayerPose): PoseMarker {
  const dotX = ((pose.x + OFFSET_X) / CELL) * CELL_PX + CELL_PX / 2;
  const dotZ = ((pose.z + OFFSET_Z) / CELL) * CELL_PX + CELL_PX / 2;
  return {
    dotX,
    dotZ,
    headX: dotX + Math.sin(pose.heading) * CELL_PX * 0.6,
    headZ: dotZ + Math.cos(pose.heading) * CELL_PX * 0.6,
  };
}
