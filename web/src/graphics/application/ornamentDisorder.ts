import { DISORDER_TUNING } from "../config/disorder.ts";
import type { BandDrawing } from "../domain/motifs/bands.ts";
import type { DisorderInput } from "../domain/motifs/disorder.ts";
import { CHARACTER } from "../domain/motifs/figures/character.ts";
import type { Shape } from "../domain/shapes.ts";
import { fnv1a, mulberry32 } from "../../shared/rng.ts";

export type Cut = { surface: string; band: string; at: string };

export type CutSite = { seed: number; anomalyRate: number; surface: string; band: string; cells: number; log?: Cut[] };

export function disorderFraction(anomalyRate: number): number {
  const { neutralAnomaly, exponent, maxScale } = DISORDER_TUNING;
  const scale = Math.min(maxScale, Math.pow(Math.max(0, anomalyRate) / neutralAnomaly, exponent));
  return CHARACTER.disorder.fraction * scale;
}

/** Seeded per work and surface band; the expected count is rounded by the same rng, so a short band still interrupts now and then and the 1 % holds over the whole work. */
export function disorderFor(site: CutSite): DisorderInput | undefined {
  const expected = site.cells * disorderFraction(site.anomalyRate);
  if (expected <= 0 || site.cells <= 0) return undefined;
  const rng = mulberry32(fnv1a(`${site.seed}:${site.surface}:${site.band}`));
  const k = Math.min(site.cells, Math.floor(expected) + (rng() < expected - Math.floor(expected) ? 1 : 0));
  return k === 0 ? undefined : { rng, policy: { ...CHARACTER.disorder, fraction: k / site.cells } };
}

export function cutBand(draw: (disorder?: DisorderInput) => BandDrawing, site: CutSite): Shape[] {
  const drawing = draw(disorderFor(site));
  for (const [key, value] of Object.entries(drawing.params)) {
    if (key.endsWith("InterruptedAt") && value !== "none") site.log?.push({ surface: site.surface, band: site.band, at: String(value) });
  }
  return drawing.shapes;
}

export function cutsParams(log: readonly Cut[]): Record<string, number | string> {
  if (log.length === 0) return { celdas_interrumpidas: 0 };
  const cells = log.reduce((n, c) => n + c.at.split(",").length, 0);
  return { celdas_interrumpidas: cells, interrupciones: log.map((c) => `${c.surface} ${c.band} [${c.at}]`).join("; ") };
}
