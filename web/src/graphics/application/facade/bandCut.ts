import type { BandDrawing } from "../../domain/motifs/bands.ts";
import type { DisorderInput } from "../../domain/motifs/disorder.ts";
import type { Shape } from "../../domain/shapes.ts";
import { cutBand } from "../ornamentDisorder.ts";
import type { Painter } from "../painter.ts";

/** A facade band through Molnár's interruptions, seeded by the work's seed and the element it decorates. */
export function facadeBand(p: Painter, surface: string, band: string, cells: number, draw: (d?: DisorderInput) => BandDrawing): Shape[] {
  return cutBand(draw, { seed: p.art.seed, anomalyRate: p.art.anomalyRate, surface, band, cells, log: p.cuts });
}
