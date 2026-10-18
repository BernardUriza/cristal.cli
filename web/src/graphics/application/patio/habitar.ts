import { REWRITES, REWRITE_TUNING } from "../../config/rewrites.ts";
import type { ArchGrammar } from "../../domain/motifs/figures/body/program/types.ts";
import type { CreaturePiece } from "../../domain/motifs/figures/creature.ts";
import { baseOf, semanticName } from "../../domain/motifs/figures/body/program/sockets.ts";
import { boxAnchors, renamePart, type Part } from "../../domain/motifs/figures/parts.ts";
import { trunkOf } from "../../domain/motifs/figures/trunk.ts";
import { facade } from "../../domain/rewrite/facade.ts";
import { portal, type MiniComposer } from "../../domain/rewrite/portal.ts";
import { rewriteTree, type Ink, type RewriteEnv, type RewriteRecord, type Rule, type TreeResult } from "../../domain/rewrite/rewrite.ts";
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

const isTorso = (slot: string): boolean => semanticName(baseOf(slot)) === "torso";

export const REGION_NOTE = { trunk: "tronco (anclas semánticas)", torso: "socket torso", whole: "figura entera: sin tronco legible" } as const;

/** The torso region of a piece as a part T2 can match; undefined when its anchors do not name a body (stair, lone eye). */
export function trunkPart(part: Part): Part | undefined {
  const t = part.regions && part.mask ? trunkOf(part.mask, part.regions, REWRITE_TUNING.trunk) : undefined;
  return t && { id: `${part.id}#tronco`, role: "enclosure", geometryId: "tronco", anchors: boxAnchors(t.mask), mask: t.mask, children: [] };
}

/** T2 only on the torso (its trunk region when the anchors name one), head, tail and limbs keep their strokes; T3 on every opening big enough. */
export function habitar(pieces: CreaturePiece[], creatureId: string, asFacade: boolean, opts: Inhabit, rng: Rng): { shapes: Shape[]; records: RewriteRecord[] } {
  const whole = creatureRules(true, opts.mini);
  const openings = creatureRules(false, opts.mini);
  const hasTorso = pieces.some((p) => isTorso(p.slot));
  const byGrammar = new Map<ArchGrammar, Rule[]>();
  const shapes: Shape[] = [];
  const records: RewriteRecord[] = [];
  for (const piece of pieces) {
    const part = renamePart(piece.part, `${creatureId}.${piece.part.id}`);
    const g = piece.grammar;
    const env = (region: string): RewriteEnv => ({ depth: 0, seed: opts.seed, reason: g ? `${REASON_BODIES}; el programa arquitecturiza ${piece.slot} como ${g}` : REASON_BODIES, rng, ink: opts.ink, region });
    const keep = (r: TreeResult) => {
      shapes.push(...(r.rootReplaced ? r.shapes : [...piece.shapes, ...r.shapes]));
      records.push(...r.records);
    };
    if (g) {
      if (!byGrammar.has(g)) byGrammar.set(g, grammarRules(g, opts.mini));
      keep(rewriteTree(part, byGrammar.get(g)!, env(`socket ${piece.slot} (${g})`)));
      continue;
    }
    const facadeHere = asFacade && (!hasTorso || isTorso(piece.slot));
    const trunk = facadeHere ? trunkPart(part) : undefined;
    if (!trunk) {
      keep(rewriteTree(part, facadeHere ? whole : openings, env(facadeHere ? (hasTorso && pieces.length > 1 ? REGION_NOTE.torso : REGION_NOTE.whole) : `aberturas de ${piece.slot}`)));
      continue;
    }
    const lived = rewriteTree(trunk, whole, env(REGION_NOTE.trunk));
    const rest = rewriteTree(part, openings, env(`aberturas de ${piece.slot}`), false);
    shapes.push(...piece.shapes, ...lived.shapes, ...rest.shapes);
    records.push(...lived.records, ...rest.records);
  }
  return { shapes, records };
}
