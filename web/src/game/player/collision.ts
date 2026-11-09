import type { Maze } from "../maze";
import { buildWalls } from "../mazeWalls";

export interface Box {
  minX: number;
  maxX: number;
  minZ: number;
  maxZ: number;
}

/** a standing body the player walks around: a console, an inhabitant */
export interface Pillar {
  x: number;
  z: number;
  radius: number;
}

export interface Point {
  x: number;
  z: number;
}

const RESOLVE_PASSES = 4;
const boxCache = new WeakMap<Maze, Box[]>();

export function wallBoxes(maze: Maze): Box[] {
  const cached = boxCache.get(maze);
  if (cached) return cached;
  const boxes = buildWalls(maze).map(({ position, size }) => ({
    minX: position[0] - size[0] / 2,
    maxX: position[0] + size[0] / 2,
    minZ: position[2] - size[2] / 2,
    maxZ: position[2] + size[2] / 2,
  }));
  boxCache.set(maze, boxes);
  return boxes;
}

function pushOutOfBox(box: Box, pos: Point, radius: number): void {
  const nearX = Math.max(box.minX, Math.min(pos.x, box.maxX));
  const nearZ = Math.max(box.minZ, Math.min(pos.z, box.maxZ));
  const dx = pos.x - nearX;
  const dz = pos.z - nearZ;
  const distSq = dx * dx + dz * dz;
  if (distSq >= radius * radius) return;
  if (distSq > 1e-9) {
    const dist = Math.sqrt(distSq);
    const push = (radius - dist) / dist;
    pos.x += dx * push;
    pos.z += dz * push;
    return;
  }
  const toMinX = pos.x - box.minX;
  const toMaxX = box.maxX - pos.x;
  const toMinZ = pos.z - box.minZ;
  const toMaxZ = box.maxZ - pos.z;
  const least = Math.min(toMinX, toMaxX, toMinZ, toMaxZ);
  if (least === toMinX) pos.x = box.minX - radius;
  else if (least === toMaxX) pos.x = box.maxX + radius;
  else if (least === toMinZ) pos.z = box.minZ - radius;
  else pos.z = box.maxZ + radius;
}

function pushOutOfPillar(pillar: Pillar, pos: Point, radius: number): void {
  const dx = pos.x - pillar.x;
  const dz = pos.z - pillar.z;
  const reach = radius + pillar.radius;
  const distSq = dx * dx + dz * dz;
  if (distSq >= reach * reach) return;
  if (distSq < 1e-9) {
    pos.x = pillar.x + reach;
    return;
  }
  const dist = Math.sqrt(distSq);
  pos.x = pillar.x + (dx / dist) * reach;
  pos.z = pillar.z + (dz / dist) * reach;
}

// Mutates `pos` to the nearest spot where a circle of `radius` touches nothing.
// Pushing out along the contact normal is what lets the player slide past a
// wall end instead of stopping dead against it.
export function resolveCircle(
  maze: Maze,
  pos: Point,
  radius: number,
  pillars: readonly Pillar[] = []
): void {
  const boxes = wallBoxes(maze);
  for (let pass = 0; pass < RESOLVE_PASSES; pass++) {
    const beforeX = pos.x;
    const beforeZ = pos.z;
    for (const box of boxes) pushOutOfBox(box, pos, radius);
    for (const pillar of pillars) pushOutOfPillar(pillar, pos, radius);
    if (pos.x === beforeX && pos.z === beforeZ) return;
  }
}
