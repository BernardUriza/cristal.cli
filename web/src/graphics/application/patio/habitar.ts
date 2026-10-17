import { REWRITES, REWRITE_TUNING } from "../../config/rewrites.ts";
import type { CreaturePiece } from "../../domain/motifs/figures/creature.ts";
import { renamePart } from "../../domain/motifs/figures/parts.ts";
import { facade } from "../../domain/rewrite/facade.ts";
import { portal, type MiniComposer } from "../../domain/rewrite/portal.ts";
import { rewriteTree, type Ink, type RewriteRecord, type Rule } from "../../domain/rewrite/rewrite.ts";
import type { Shape } from "../../domain/shapes.ts";
import type { Rng } from "../../../shared/rng.ts";

export type Inhabit = { ink: Ink; seed: number; mini?: MiniComposer };

export const REASON_BODIES = "La narración describe cuerpos habitados";

export function creatureRules(asFacade: boolean, mini?: MiniComposer): Rule[] {
  const t3: Rule = { rewrite: REWRITES.T3_OPENING_AS_PORTAL, produce: portal({ frames: REWRITE_TUNING.corridorFrames, miniPx: REWRITE_TUNING.miniPatioPx, mini }) };
  return asFacade ? [{ rewrite: REWRITES.T2_BODY_AS_FACADE, produce: facade(REWRITE_TUNING.facadeCellPx) }, t3] : [t3];
}

/** T2 on the torso of a creature chosen to be a building, T3 on every opening big enough; a rewritten piece replaces the motif's own strokes. */
export function habitar(pieces: CreaturePiece[], creatureId: string, asFacade: boolean, opts: Inhabit, rng: Rng): { shapes: Shape[]; records: RewriteRecord[] } {
  const rules = creatureRules(asFacade, opts.mini);
  const shapes: Shape[] = [];
  const records: RewriteRecord[] = [];
  for (const piece of pieces) {
    const part = renamePart(piece.part, `${creatureId}.${piece.part.id}`);
    const r = rewriteTree(part, rules, { depth: 0, seed: opts.seed, reason: REASON_BODIES, rng, ink: opts.ink });
    shapes.push(...(r.rootReplaced ? r.shapes : [...piece.shapes, ...r.shapes]));
    records.push(...r.records);
  }
  return { shapes, records };
}
