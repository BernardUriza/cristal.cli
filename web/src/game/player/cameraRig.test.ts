import { describe, expect, it } from "vitest";
import * as THREE from "three";
import { generateMaze, cellCenter } from "../maze";
import { CAM_DISTANCE, CAM_HEIGHT, computeConsoleCamera, computeExplorationCamera } from "./cameraRig";

const MAX_CAM_TO_LOOK = CAM_DISTANCE + CAM_HEIGHT;

describe("computeExplorationCamera", () => {
  it("places the camera behind the player looking at head height", () => {
    const maze = generateMaze(6, 6);
    const [x, z] = cellCenter(maze, 2, 2);
    const pos = new THREE.Vector3(x, 0, z);
    const cam = new THREE.Vector3();
    const look = new THREE.Vector3();

    computeExplorationCamera(maze, pos, 0, 0.25, cam, look);

    expect(look.x).toBeCloseTo(pos.x, 5);
    expect(look.y).toBeCloseTo(1.2, 5);
    expect(look.z).toBeCloseTo(pos.z, 5);
    expect(cam.z).toBeLessThan(pos.z);
    expect(cam.distanceTo(look)).toBeLessThanOrEqual(MAX_CAM_TO_LOOK);
  });

  it("never leaves the camera farther than the unobstructed distance", () => {
    const maze = generateMaze(6, 6);
    const [x, z] = cellCenter(maze, 0, 0);
    const pos = new THREE.Vector3(x, 0, z);
    const cam = new THREE.Vector3();
    const look = new THREE.Vector3();

    computeExplorationCamera(maze, pos, Math.PI / 3, 0.1, cam, look);

    expect(cam.distanceTo(look)).toBeGreaterThanOrEqual(0.9 - 0.001);
    expect(cam.distanceTo(look)).toBeLessThanOrEqual(MAX_CAM_TO_LOOK);
  });
});

describe("computeConsoleCamera", () => {
  it("frames the console from the player's side", () => {
    const player = new THREE.Vector3(4, 0, 0);
    const focus = new THREE.Vector3(0, 0, 0);
    const cam = new THREE.Vector3();
    const look = new THREE.Vector3();

    computeConsoleCamera(player, focus, cam, look);

    expect(cam.x).toBeCloseTo(2.4, 5);
    expect(cam.y).toBeCloseTo(1.4, 5);
    expect(look.y).toBeCloseTo(1.0, 5);
    expect(look.x).toBeCloseTo(focus.x, 5);
  });
});
