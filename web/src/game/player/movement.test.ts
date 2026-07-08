import { describe, expect, it } from "vitest";
import * as THREE from "three";
import { generateMaze, cellCenter } from "../maze";
import {
  CROUCH_SPEED,
  SPRINT_SPEED,
  WALK_SPEED,
  stepGravity,
  stepMovement,
  type MoveInput,
} from "./movement";

const idleInput = (): MoveInput => ({
  forward: false,
  back: false,
  left: false,
  right: false,
  sprint: false,
  crouch: false,
});

function centerPos(maze: ReturnType<typeof generateMaze>): THREE.Vector3 {
  const [x, z] = cellCenter(maze, 1, 1);
  return new THREE.Vector3(x, 0, z);
}

describe("stepMovement", () => {
  it("reports idle and leaves position untouched without input", () => {
    const maze = generateMaze(4, 4);
    const pos = centerPos(maze);
    const before = pos.clone();

    const result = stepMovement(maze, pos, 0, idleInput(), 0.016);

    expect(result).toEqual({ moving: false, locomotion: "idle", targetYaw: null });
    expect(pos).toEqual(before);
  });

  it("walks forward along +Z at yaw 0 and yields a facing yaw", () => {
    const maze = generateMaze(4, 4);
    const pos = centerPos(maze);
    const startZ = pos.z;

    const result = stepMovement(maze, pos, 0, { ...idleInput(), forward: true }, 0.1);

    expect(result.moving).toBe(true);
    expect(result.locomotion).toBe("walk");
    expect(pos.z).toBeCloseTo(startZ + WALK_SPEED * 0.1, 5);
    expect(result.targetYaw).toBeCloseTo(0, 5);
  });

  it("sprint beats crouch beats walk in speed selection", () => {
    const maze = generateMaze(4, 4);

    const sprintPos = centerPos(maze);
    const sprint = stepMovement(
      maze,
      sprintPos,
      0,
      { ...idleInput(), forward: true, sprint: true },
      0.1
    );
    expect(sprint.locomotion).toBe("run");
    expect(sprintPos.z).toBeCloseTo(centerPos(maze).z + SPRINT_SPEED * 0.1, 5);

    const crouchPos = centerPos(maze);
    const crouch = stepMovement(
      maze,
      crouchPos,
      0,
      { ...idleInput(), forward: true, sprint: true, crouch: true },
      0.1
    );
    expect(crouch.locomotion).toBe("walk");
    expect(crouchPos.z).toBeCloseTo(centerPos(maze).z + CROUCH_SPEED * 0.1, 5);
  });

  it("blocks movement into a wall but slides along the open axis", () => {
    const maze = generateMaze(4, 4);
    const pos = centerPos(maze);
    const before = pos.clone();

    for (let i = 0; i < 200; i++) {
      stepMovement(maze, pos, 0, { ...idleInput(), forward: true }, 0.05);
    }

    const cellSpan = 4 * 4;
    expect(Math.abs(pos.z - before.z)).toBeLessThan(cellSpan);
    expect(Number.isFinite(pos.x)).toBe(true);
    expect(Number.isFinite(pos.z)).toBe(true);
  });
});

describe("stepGravity", () => {
  it("consumes a jump from the ground and leaves the floor", () => {
    const pos = new THREE.Vector3(0, 0, 0);
    const v = { velY: 0, grounded: true };

    const consumed = stepGravity(pos, v, true, 0.016);

    expect(consumed).toBe(true);
    expect(v.grounded).toBe(false);
    expect(pos.y).toBeGreaterThan(0);
  });

  it("ignores a jump while airborne", () => {
    const pos = new THREE.Vector3(0, 1, 0);
    const v = { velY: 1, grounded: false };

    const consumed = stepGravity(pos, v, true, 0.016);

    expect(consumed).toBe(false);
  });

  it("lands back on the floor and re-grounds", () => {
    const pos = new THREE.Vector3(0, 0.01, 0);
    const v = { velY: -5, grounded: false };

    stepGravity(pos, v, false, 0.1);

    expect(pos.y).toBe(0);
    expect(v.velY).toBe(0);
    expect(v.grounded).toBe(true);
  });
});
