import * as THREE from "three";
import type { Maze } from "../maze";
import { resolveCircle, type Pillar } from "./collision";
import type { Locomotion } from "../types";

export const WALK_SPEED = 4;
export const SPRINT_SPEED = 7;
export const CROUCH_SPEED = 2;
export const GRAVITY = -15;
export const JUMP_HEIGHT = 1.2;
export const ROTATION_SPEED = 10;
export const KEY_TURN_SPEED = 2.4;
export const PLAYER_RADIUS = 0.45;
// below this share of the intended step the body is pressed on a wall, not walking
const BLOCKED_SHARE = 0.25;
// how much of the speed a grazed wall hands back: at 45 degrees the body keeps all of it
const GLIDE_BOOST = 1.45;

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

// Mutates `pos`; returns how far the body really travelled after the walls pushed back.
// A grazed wall hands the lost speed back along itself, so brushing a wall never drags.
function advance(
  maze: Maze,
  pos: THREE.Vector3,
  dir: THREE.Vector3,
  distance: number,
  pillars: readonly Pillar[]
): number {
  const startX = pos.x;
  const startZ = pos.z;
  pos.x += dir.x * distance;
  pos.z += dir.z * distance;
  resolveCircle(maze, pos, PLAYER_RADIUS, pillars);
  const slideX = pos.x - startX;
  const slideZ = pos.z - startZ;
  const slid = Math.hypot(slideX, slideZ);
  // The shallower the graze, the more of the lost speed comes back; head-on still stops.
  const wanted = distance * Math.min(1, (slid / distance) * GLIDE_BOOST);
  const rest = wanted - slid;
  if (slid < 1e-6 || rest <= 0) return slid;
  pos.x += (slideX / slid) * rest;
  pos.z += (slideZ / slid) * rest;
  resolveCircle(maze, pos, PLAYER_RADIUS, pillars);
  return Math.hypot(pos.x - startX, pos.z - startZ);
}

// Mutates `pos`. A body pressed against a wall stands; it never walks in place.
export function stepMovement(
  maze: Maze,
  pos: THREE.Vector3,
  yaw: number,
  input: MoveInput,
  dt: number,
  pillars: readonly Pillar[] = []
): MoveResult {
  if (!computeMoveDirection(yaw, input, tmpMove)) {
    return { moving: false, locomotion: "idle", targetYaw: null };
  }
  let speed = WALK_SPEED;
  const sprinting = input.sprint && !input.crouch;
  if (sprinting) speed = SPRINT_SPEED;
  else if (input.crouch) speed = CROUCH_SPEED;

  const targetYaw = Math.atan2(tmpMove.x, tmpMove.z);
  const intended = speed * dt;
  const travelled = advance(maze, pos, tmpMove, intended, pillars);
  const blocked = travelled < intended * BLOCKED_SHARE;

  return {
    moving: true,
    locomotion: blocked ? "idle" : sprinting ? "run" : "walk",
    targetYaw,
  };
}

export function stepTowards(
  maze: Maze,
  pos: THREE.Vector3,
  target: { x: number; z: number },
  speed: number,
  dt: number,
  pillars: readonly Pillar[] = []
): MoveResult {
  tmpMove.set(target.x - pos.x, 0, target.z - pos.z);
  if (tmpMove.lengthSq() < 0.04) return { moving: false, locomotion: "idle", targetYaw: null };
  tmpMove.normalize();
  const targetYaw = Math.atan2(tmpMove.x, tmpMove.z);
  advance(maze, pos, tmpMove, speed * dt, pillars);
  return { moving: true, locomotion: "walk", targetYaw };
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
