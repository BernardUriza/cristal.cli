import { REWRITES, REWRITE_TUNING } from "../../config/rewrites.ts";
import type { ArchGrammar } from "../../domain/motifs/figures/body/program/types.ts";
import type { CreaturePiece } from "../../domain/motifs/figures/creature.ts";
import { renamePart } from "../../domain/motifs/figures/parts.ts";
import { facade } from "../../domain/rewrite/facade.ts";
import { portal, type MiniComposer } from "../../domain/rewrite/portal.ts";
import { rewriteTree, type Ink, type RewriteRecord, type Rule } from "../../domain/rewrite/rewrite.ts";
import type { Shape } from "../../domain/shapes.ts";
import type { Rng } from "../../../shared/rng.ts";

export type Inhabit = { ink: Ink; seed: number; mini?: MiniComposer };

const T3 = REWRITES.T3_OPENING_AS_PORTAL;

export const REASON_BODIES = "La narración describe cuerpos habitados";

export function creatureRules(asFacade: boolean, mini?: MiniComposer): Rule[] {
  const t3: Rule = { rewrite: REWRITES.T3_OPENING_AS_PORTAL, produce: portal({ frames: REWRITE_TUNING.corridorFrames, miniPx: REWRITE_TUNING.miniPatioPx, mini, deepest: T3.constraints.maxDepth, nextMinPx: T3.constraints.minProjectedPx }) };
  return asFacade ? [{ rewrite: REWRITES.T2_BODY_AS_FACADE, produce: facade(REWRITE_TUNING.facadeCellPx) }, t3] : [t3];
}

const forced = (rewrite: Rule["rewrite"], produce: Rule["produce"]): Rule => ({
  rewrite: { ...rewrite, match: {}, constraints: { ...rewrite.constraints, minProjectedPx: Math.min(rewrite.constraints.minProjectedPx, REWRITE_TUNING.declaredMinPx) } },
  produce,
});

/** architecturalize reuses T2 (facade, denser storeys for a tower) and T3 (a gallery of frames) on whatever part the program names. */
export function grammarRules(grammar: ArchGrammar, mini?: MiniComposer): Rule[] {
  const [t2, t3] = creatureRules(true, mini);
  if (grammar === "gallery") return [forced(t3.rewrite, t3.produce)];
  const cell = grammar === "tower" ? REWRITE_TUNING.facadeCellPx * REWRITE_TUNING.towerCellRatio : REWRITE_TUNING.facadeCellPx;
  return [forced(t2.rewrite, facade(cell)), t3];
}

/** T2 on the torso of a creature chosen to be a building, T3 on every opening big enough; a rewritten piece replaces the motif's own strokes. */
export function habitar(pieces: CreaturePiece[], creatureId: string, asFacade: boolean, opts: Inhabit, rng: Rng): { shapes: Shape[]; records: RewriteRecord[] } {
  const rules = creatureRules(asFacade, opts.mini);
  const byGrammar = new Map<ArchGrammar, Rule[]>();
  const shapes: Shape[] = [];
  const records: RewriteRecord[] = [];
  for (const piece of pieces) {
    const part = renamePart(piece.part, `${creatureId}.${piece.part.id}`);
    const g = piece.grammar;
    if (g && !byGrammar.has(g)) byGrammar.set(g, grammarRules(g, opts.mini));
    const reason = g ? `${REASON_BODIES}; el programa arquitecturiza ${piece.slot} como ${g}` : REASON_BODIES;
    const r = rewriteTree(part, g ? byGrammar.get(g)! : rules, { depth: 0, seed: opts.seed, reason, rng, ink: opts.ink });
    shapes.push(...(r.rootReplaced ? r.shapes : [...piece.shapes, ...r.shapes]));
    records.push(...r.records);
  }
  return { shapes, records };
}
