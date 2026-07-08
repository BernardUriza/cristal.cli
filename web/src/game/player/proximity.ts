import type * as THREE from "three";

export const INTERACT_RANGE = 2.6;

export interface Positioned {
  id: string;
  position: THREE.Vector3;
}

export function findNearestId(
  items: readonly Positioned[],
  from: THREE.Vector3,
  range: number = INTERACT_RANGE
): string | null {
  let nearest: string | null = null;
  let nearestDist = range;
  for (const item of items) {
    const d = item.position.distanceTo(from);
    if (d < nearestDist) {
      nearestDist = d;
      nearest = item.id;
    }
  }
  return nearest;
}
