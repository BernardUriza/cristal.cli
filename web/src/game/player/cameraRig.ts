import * as THREE from "three";
import { isWalkable, type Maze } from "../maze";

export const CAM_DISTANCE = 6;
export const CAM_HEIGHT = 1.6;
export const EXPLORE_LERP = 0.18;
export const CONSOLE_LERP = 0.08;

const tmpDir = new THREE.Vector3();

// Writes into outCam/outLook. Pulls the camera in if the desired spot would
// clip a maze wall.
export function computeExplorationCamera(
  maze: Maze,
  pos: THREE.Vector3,
  yaw: number,
  pitch: number,
  outCam: THREE.Vector3,
  outLook: THREE.Vector3
): void {
  const horiz = CAM_DISTANCE * Math.cos(pitch);
  outCam.set(
    pos.x - Math.sin(yaw) * horiz,
    pos.y + CAM_HEIGHT + CAM_DISTANCE * Math.sin(pitch),
    pos.z - Math.cos(yaw) * horiz
  );
  outLook.set(pos.x, pos.y + 1.2, pos.z);

  tmpDir.copy(outCam).sub(outLook);
  const dist = tmpDir.length();
  tmpDir.normalize();
  let safe = dist;
  for (let d = 0.6; d <= dist; d += 0.4) {
    if (!isWalkable(maze, outLook.x + tmpDir.x * d, outLook.z + tmpDir.z * d, 0.35)) {
      safe = Math.max(0.9, d - 0.4);
      break;
    }
  }
  outCam.copy(outLook).addScaledVector(tmpDir, safe);
}

// Frames the focused console from the player's side of it.
export function computeConsoleCamera(
  playerPos: THREE.Vector3,
  focus: THREE.Vector3,
  outCam: THREE.Vector3,
  outLook: THREE.Vector3
): void {
  tmpDir.copy(playerPos).sub(focus).setY(0).normalize();
  outCam.set(focus.x + tmpDir.x * 2.4, focus.y + 1.4, focus.z + tmpDir.z * 2.4);
  outLook.copy(focus).setY(focus.y + 1.0);
}
