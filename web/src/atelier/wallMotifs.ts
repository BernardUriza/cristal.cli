import { MOTIFS } from "../graphics/domain/motifs/figures/index.ts";
import { motifThumbnailSvg } from "../graphics/renderers/svg/motifThumbnail.ts";
import { MOTIF_NAMES, type MotifName } from "./vocabulary.ts";
import type { WallMotif } from "./Wall.tsx";

export const THUMBNAIL_PX = 96;

export function wallMotifs(): WallMotif[] {
  return MOTIF_NAMES.filter((id): id is MotifName => id in MOTIFS).map((id) => ({
    id,
    name: MOTIFS[id].name,
    tags: MOTIFS[id].tags,
    svg: motifThumbnailSvg(id, THUMBNAIL_PX, 2),
  }));
}
