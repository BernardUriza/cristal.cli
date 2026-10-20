export const MAX_FLUORESCENT_AREA_LIGHTS = 8;

export interface AreaLightCandidate {
  id: string;
  kind: string;
  position: readonly [number, number, number];
}

export function stableFurnitureHash(x: number, z: number) {
  let n = Math.round(x * 10) * 73856093;
  n ^= Math.round(z * 10) * 19349663;
  n = (n ^ (n >> 13)) * 1274126177;
  return (n ^ (n >> 16)) >>> 0;
}

function positionKey(position: readonly [number, number, number]) {
  return `${position[0].toFixed(1)}:${position[2].toFixed(1)}`;
}

export function assignAreaLights(
  items: readonly AreaLightCandidate[],
  max = MAX_FLUORESCENT_AREA_LIGHTS
): ReadonlySet<string> {
  const litKeys = new Set<string>();
  const litIds = new Set<string>();
  for (const item of items) {
    if (item.kind !== "fluorescent_ceiling_light") continue;
    const key = positionKey(item.position);
    if (!litKeys.has(key)) {
      if (litKeys.size >= max || stableFurnitureHash(item.position[0], item.position[2]) % 3 !== 0) continue;
      litKeys.add(key);
    }
    litIds.add(item.id);
  }
  return litIds;
}
