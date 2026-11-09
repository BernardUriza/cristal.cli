import { describe, expect, it } from "vitest";
import * as THREE from "three";
import { CELL, cellAt, cellCenter, generateMaze, type Maze } from "../maze";
import { MAZE_COLS, MAZE_ROWS, MAZE_SEED } from "../mazeConfig";
import { mulberry32 } from "../../shared/rng";
import { resolveCircle, wallBoxes } from "./collision";
import { PLAYER_RADIUS, stepMovement, type MoveInput } from "./movement";

const maze = generateMaze(MAZE_COLS, MAZE_ROWS, MAZE_SEED);
const DT = 1 / 60;

const input = (keys: Partial<MoveInput>): MoveInput => ({
  forward: false,
  back: false,
  left: false,
  right: false,
  sprint: false,
  crouch: false,
  ...keys,
});

function clearance(m: Maze, x: number, z: number): number {
  let least = Infinity;
  for (const box of wallBoxes(m)) {
    const dx = x - Math.max(box.minX, Math.min(x, box.maxX));
    const dz = z - Math.max(box.minZ, Math.min(z, box.maxZ));
    least = Math.min(least, Math.hypot(dx, dz));
  }
  return least;
}

/** a cell open to the north and east whose shared corner still holds a wall end */
function convexCorner(m: Maze): { x: number; y: number } {
  for (let y = 1; y < m.rows; y++) {
    for (let x = 0; x < m.cols - 1; x++) {
      const cell = m.cells[y][x];
      if (cell.n || cell.e) continue;
      if (m.cells[y - 1][x].e || m.cells[y][x + 1].n) return { x, y };
    }
  }
  throw new Error("this maze has no convex corner to test against");
}

describe("resolveCircle", () => {
  it("never leaves the body inside a wall, whatever the player mashes", () => {
    const rng = mulberry32(7);
    const [sx, sz] = cellCenter(maze, MAZE_COLS >> 1, MAZE_ROWS >> 1);
    const pos = new THREE.Vector3(sx, 0, sz);
    let yaw = 0;
    let keys = input({ forward: true });
    for (let frame = 0; frame < 20000; frame++) {
      if (frame % 45 === 0) {
        yaw = rng() * Math.PI * 2;
        keys = input({ forward: rng() > 0.2, left: rng() > 0.7, right: rng() > 0.7, sprint: rng() > 0.5 });
      }
      stepMovement(maze, pos, yaw, keys, DT);
      expect(clearance(maze, pos.x, pos.z)).toBeGreaterThan(PLAYER_RADIUS - 1e-3);
    }
    const half = (MAZE_COLS * CELL) / 2;
    expect(Math.abs(pos.x)).toBeLessThan(half);
    expect(Math.abs(pos.z)).toBeLessThan(half);
  });

  it("slides past a wall end instead of stopping dead in the corner", () => {
    const corner = convexCorner(maze);
    const [cx, cz] = cellCenter(maze, corner.x, corner.y);
    const pos = new THREE.Vector3(cx + 0.35, 0, cz);
    const northEast = Math.atan2(1, -1);
    for (let frame = 0; frame < 240; frame++) {
      stepMovement(maze, pos, northEast, input({ forward: true }), DT);
    }
    expect(cellAt(maze, pos.x, pos.z)).not.toEqual(corner);
  });

  it("walks around a standing body and never through it", () => {
    const [cx, cz] = cellCenter(maze, MAZE_COLS >> 1, MAZE_ROWS >> 1);
    const pillar = { x: cx, z: cz, radius: 0.55 };
    const pos = { x: cx + 0.1, z: cz - 0.2 };
    resolveCircle(maze, pos, PLAYER_RADIUS, [pillar]);
    expect(Math.hypot(pos.x - cx, pos.z - cz)).toBeGreaterThanOrEqual(PLAYER_RADIUS + pillar.radius - 1e-6);
  });
});

describe("stepMovement against a wall", () => {
  it("stands still, facing the wall, instead of walking in place", () => {
    const walled = maze.cells.flat().find((cell) => cell.s);
    if (!walled) throw new Error("no cell with a south wall");
    const [cx, cz] = cellCenter(maze, walled.x, walled.y);
    const pos = new THREE.Vector3(cx, 0, cz);
    let last = stepMovement(maze, pos, 0, input({ forward: true }), DT);
    for (let frame = 0; frame < 120; frame++) {
      last = stepMovement(maze, pos, 0, input({ forward: true }), DT);
    }
    expect(last.locomotion).toBe("idle");
    expect(last.targetYaw).toBeCloseTo(0, 5);
    expect(pos.z).toBeLessThan(cz + CELL / 2);
  });
});
