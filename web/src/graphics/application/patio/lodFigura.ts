import { DETAIL_LOD } from "../../config/detail.ts";
import { detailAt, type DetailChoice, type DetailLevel } from "../../domain/lod.ts";
import type { CreaturePiece } from "../../domain/motifs/figures/creature.ts";

export type FigureLod = DetailChoice & { pieces: string[] };

/** The figure's detail by its projected height, and the detail each of its pieces drew at by its own size. */
export function figureLod(heightPx: number, cap: DetailLevel, pieces: readonly CreaturePiece[]): FigureLod {
  const own = detailAt(heightPx, DETAIL_LOD.bandsPx, cap);
  return { ...own, pieces: pieces.flatMap((p) => (p.lod ? [`${p.slot} ${p.lod.detail} (${Math.round(p.lod.px)} px)`] : [])) };
}

export function lodNote(id: string, lod: FigureLod): string {
  return `${id} detail ${lod.detail}: ${lod.why}${lod.pieces.length ? `; piezas ${lod.pieces.join(", ")}` : ""}`;
}
