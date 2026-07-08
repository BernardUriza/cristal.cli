import * as THREE from "three";
import { isWalkable, type Maze } from "../maze";
import type { Locomotion } from "../types";

export const WALK_SPEED = 4;
export const SPRINT_SPEED = 7;
export const CROUCH_SPEED = 2;
export const GRAVITY = -15;
export const JUMP_HEIGHT = 1.2;
export const ROTATION_SPEED = 10;
export const PLAYER_RADIUS = 0.6;

export interface MoveInput {
  forward: boolean;
  back: boolean;
  left: boolean;
  right: boolean;
  sprint: boolean;
  crouch: boolean;
}

export interface MoveResult {
  moving: boolean;
  locomotion: Locomotion;
  targetYaw: number | null;
}

const tmpForward = new THREE.Vector3();
const tmpRight = new THREE.Vector3();
const tmpMove = new THREE.Vector3();

export type DirectionInput = Pick<MoveInput, "forward" | "back" | "left" | "right">;

// Writes the normalized world-space move direction into `out`; returns false
// when there is no directional input. screen-right = cross(forward, up); the
// old (cos,-sin) form was its negative, which made A/D strafe the wrong way.
export function computeMoveDirection(
  yaw: number,
  input: DirectionInput,
  out: THREE.Vector3
): boolean {
  tmpForward.set(Math.sin(yaw), 0, Math.cos(yaw)).normalize();
  tmpRight.set(-Math.cos(yaw), 0, Math.sin(yaw)).normalize();
  const ix = (input.right ? 1 : 0) - (input.left ? 1 : 0);
  const iz = (input.forward ? 1 : 0) - (input.back ? 1 : 0);
  out.set(0, 0, 0).addScaledVector(tmpForward, iz).addScaledVector(tmpRight, ix);
  if (out.lengthSq() <= 0.001) return false;
  out.normalize();
  return true;
}

// Mutates `pos`. Axes resolve independently so the player slides along walls.
export function stepMovement(
  maze: Maze,
  pos: THREE.Vector3,
  yaw: number,
  input: MoveInput,
  dt: number
): MoveResult {
  if (!computeMoveDirection(yaw, input, tmpMove)) {
    return { moving: false, locomotion: "idle", targetYaw: null };
  }
  let speed = WALK_SPEED;
  const sprinting = input.sprint && !input.crouch;
  if (sprinting) speed = SPRINT_SPEED;
  else if (input.crouch) speed = CROUCH_SPEED;

  const nextX = pos.x + tmpMove.x * speed * dt;
  if (isWalkable(maze, nextX, pos.z, PLAYER_RADIUS)) pos.x = nextX;
  const nextZ = pos.z + tmpMove.z * speed * dt;
  if (isWalkable(maze, pos.x, nextZ, PLAYER_RADIUS)) pos.z = nextZ;

  return {
    moving: true,
    locomotion: sprinting ? "run" : "walk",
    targetYaw: Math.atan2(tmpMove.x, tmpMove.z),
  };
}

export interface VerticalState {
  velY: number;
  grounded: boolean;
}

// Mutates `pos` and `v`. Returns true when the jump request was consumed.
export function stepGravity(
  pos: THREE.Vector3,
  v: VerticalState,
  jumpRequested: boolean,
  dt: number
): boolean {
  let jumpConsumed = false;
  if (v.grounded && v.velY < 0) v.velY = -2;
  if (jumpRequested && v.grounded) {
    v.velY = Math.sqrt(JUMP_HEIGHT * -2 * GRAVITY);
    v.grounded = false;
    jumpConsumed = true;
  }
  v.velY += GRAVITY * dt;
  pos.y += v.velY * dt;
  if (pos.y <= 0) {
    pos.y = 0;
    v.velY = 0;
    v.grounded = true;
  }
  return jumpConsumed;
}
