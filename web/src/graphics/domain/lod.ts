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

export type DetailLevel = 1 | 2 | 3;

export type DetailChoice = { detail: DetailLevel; px: number; band: number; cap: DetailLevel; why: string };

export function detailAt(projectedPx: number, bandsPx: readonly number[], cap: DetailLevel): DetailChoice {
  const band = lodLevel(projectedPx, bandsPx);
  const wanted = Math.max(1, Math.min(3, band)) as DetailLevel;
  const detail = Math.min(wanted, cap) as DetailLevel;
  const range = band === 0 ? `<${bandsPx[0]}` : band >= bandsPx.length ? `≥${bandsPx[bandsPx.length - 1]}` : `${bandsPx[band - 1]}–${bandsPx[band]}`;
  const why = `${Math.round(projectedPx)} px en banda ${band} (${range} px) pide detail ${wanted}${detail < wanted ? `, topado a ${cap} por la complexity` : ""}`;
  return { detail, px: projectedPx, band, cap, why };
}
