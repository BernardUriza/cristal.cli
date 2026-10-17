import { mulberry32 } from "../../../shared/rng.ts";
import { MOTIFS, type MotifParams } from "../../domain/motifs/figures/index.ts";
import { toSvg } from "./serialize.ts";

export const THUMBNAIL_STYLE = { fill: "#0b0f0c", ink: "#9ef0c0", accent: "#e8c547" };

export function motifThumbnailSvg(id: string, px: number, detail: MotifParams["detail"] = 2, seed = 1): string {
  const motif = MOTIFS[id];
  if (!motif) throw new Error(`motivo desconocido: ${id}`);
  const params: MotifParams = { size: px * 0.84, detail, ...THUMBNAIL_STYLE };
  return toSvg(motif.draw(px / 2, px / 2, params, mulberry32(seed)).shapes, px, px);
}
