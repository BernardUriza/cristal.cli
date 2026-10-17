import { craneo } from "./craneo.ts";
import { escalera } from "./escalera.ts";
import { jaguar } from "./jaguar.ts";
import { mano } from "./mano.ts";
import { mascara } from "./mascara.ts";
import { ojo } from "./ojo.ts";
import { perro } from "./perro.ts";
import { sirena } from "./sirena.ts";
import type { MotifDef, MotifTag } from "./types.ts";

export type { MotifDef, MotifDrawing, MotifParams, MotifTag, Provenance } from "./types.ts";

export const MOTIFS: Record<string, MotifDef> = { ojo, mano, craneo, perro, jaguar, escalera, mascara, sirena };

export const MOTIF_IDS: string[] = Object.keys(MOTIFS);

export function motifsByTag(tag: MotifTag): MotifDef[] {
  return MOTIF_IDS.map((id) => MOTIFS[id]).filter((m) => m.tags.indexOf(tag) >= 0);
}
