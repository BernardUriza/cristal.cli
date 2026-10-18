import type { MorphPolicy } from "../../../../../config/morph.ts";
import { describeMorph, isRegion, morphMotif, type MorphSpec } from "../../../morph/apply.ts";
import { MOTIFS } from "../../index.ts";
import { BodyGraphError, type MotifMorph, type PartNode } from "../types.ts";
import type { Graph } from "./subtree.ts";
import { PROGRAM_LIMITS, type CreatureOp, type OpTrace } from "./types.ts";

export type MorphState = { graph: Graph; morph?: MorphPolicy };

type Result = Pick<OpTrace, "targets" | "added" | "removed" | "detail" | "morph">;

const FEATURES_LOST_AT = 0.5;

function policyOf(s: MorphState): MorphPolicy {
  if (!s.morph) throw new BodyGraphError("no-morph-policy", "blend/caricature need the morph policy (config/morph.ts)");
  return s.morph;
}

function motifTargets(nodes: PartNode[], socket: string): Array<PartNode & { kind: { motif: string; morph?: MotifMorph } }> {
  return nodes.map((n) => {
    if (!("motif" in n.kind)) throw new BodyGraphError("not-a-motif", `${socket} (${n.id}) is a ${n.kind.primitive}; replace it with a motif first`);
    return n as PartNode & { kind: { motif: string; morph?: MotifMorph } };
  });
}

function remorph(s: MorphState, nodes: PartNode[], socket: string, next: (prev: MorphSpec, base: string) => MorphSpec): { notes: string[]; labels: string[] } {
  const policy = policyOf(s);
  const done = new Map<string, MotifMorph>();
  const notes: string[] = [];
  for (const n of motifTargets(nodes, socket)) {
    const spec = next(n.kind.morph?.spec ?? {}, n.kind.motif);
    const key = `${n.kind.motif}|${JSON.stringify(spec)}`;
    if (!done.has(key)) {
      const r = morphMotif(n.kind.motif, spec, policy);
      const head = r.hybrid?.regions.find((x) => x.region === "cabeza")?.weight ?? 0;
      done.set(key, { label: r.label, contour: r.contour.points, features: head < FEATURES_LOST_AT, spec });
      notes.push(`${r.label}: ${describeMorph(r)}`);
    }
    const morph = done.get(key)!;
    s.graph = { ...s.graph, nodes: s.graph.nodes.map((x) => (x.id === n.id ? { ...x, kind: { motif: n.kind.motif, morph } } : x)) };
  }
  return { notes, labels: [...done.values()].map((m) => m.label) };
}

export function blend(s: MorphState, op: Extract<CreatureOp, { op: "blend" }>, targets: PartNode[]): Result {
  if (!MOTIFS[op.motif]) throw new BodyGraphError("unknown-kind", `motif "${op.motif}"`);
  if (!isRegion(op.region)) throw new BodyGraphError("unknown-region", `"${String(op.region)}" is not cabeza|tronco|punta|extremidad`);
  if (!(typeof op.weight === "number" && op.weight > 0 && op.weight <= 1)) throw new BodyGraphError("bad-weight", `weight=${op.weight} outside (0, 1]`);
  const r = remorph(s, targets, op.socket, (prev, base) => {
    if (base === op.motif) throw new BodyGraphError("blend-conflict", `${op.socket} already is ${base}`);
    if (prev.with && prev.with !== op.motif) throw new BodyGraphError("blend-conflict", `${op.socket} is already blended with ${prev.with}`);
    return { ...prev, with: op.motif, weights: { ...prev.weights, [op.region]: op.weight } };
  });
  return { targets: targets.map((n) => n.id), added: [], removed: [], detail: `${op.socket} ← ${r.labels.join(", ")}`, morph: r.notes.join(" | ") };
}

export function caricatureOp(s: MorphState, op: Extract<CreatureOp, { op: "caricature" }>, targets: PartNode[]): Result {
  if (!(typeof op.k === "number" && op.k >= PROGRAM_LIMITS.kMin && op.k <= PROGRAM_LIMITS.kMax)) throw new BodyGraphError("bad-k", `k=${op.k} outside ${PROGRAM_LIMITS.kMin}..${PROGRAM_LIMITS.kMax}`);
  const r = remorph(s, targets, op.socket, (prev) => ({ ...prev, k: op.k }));
  return { targets: targets.map((n) => n.id), added: [], removed: [], detail: `${op.socket} ← ${r.labels.join(", ")}`, morph: r.notes.join(" | ") };
}
