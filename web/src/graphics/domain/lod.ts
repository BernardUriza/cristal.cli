export type LodConfig = { detailScale: number };

export type Lod = { shows: (projectedPx: number, minPx?: number) => boolean };

export function visible(projectedPx: number, minPx = 5): boolean {
  return projectedPx >= minPx;
}

export function makeLod(cfg: LodConfig): Lod {
  const scale = cfg.detailScale;
  return { shows: (px, minPx = 5) => visible(px, minPx * scale) };
}

export function lodLevel(projectedPx: number, thresholds: readonly number[]): number {
  let level = 0;
  for (const t of thresholds) if (projectedPx >= t) level++;
  return level;
}

export function projectedHeightPx(worldHeight: number, distance: number, fovDeg: number, viewportPx: number): number {
  const halfFov = (fovDeg * Math.PI) / 360;
  return (worldHeight * (viewportPx / 2)) / (Math.max(distance, 1e-6) * Math.tan(halfFov));
}
