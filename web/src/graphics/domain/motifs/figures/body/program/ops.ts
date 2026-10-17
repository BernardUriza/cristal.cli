import { MOTIFS } from "../../index.ts";
import { expandBody } from "../expand.ts";
import { kindName } from "../kinds.ts";
import { BODY_TUNING } from "../tuning.ts";
import { BodyGraphError, type PartEdge, type PartNode } from "../types.ts";
import { GRAFT_ANCHOR, resolveSocket, semanticName } from "./sockets.ts";
import { cloned, parentEdge, subtreeOf, without, type Graph, type Subtree } from "./subtree.ts";
import { PROGRAM_TUNING } from "./tuning.ts";
import type { ArchGrammar, CreatureOp, OpTrace } from "./types.ts";

export type OpState = { graph: Graph; grammars: Record<string, ArchGrammar>; seed: number; index: number };

export type OpResult = Pick<OpTrace, "targets" | "added" | "removed" | "detail">;

function targetsOf(s: OpState, socket: string): PartNode[] {
  if (!semanticName(socket)) throw new BodyGraphError("missing-socket", `"${socket}" is not a semantic socket`);
  const hit = resolveSocket(s.graph, socket).filter((n) => !("primitive" in n.kind && n.kind.primitive === "pivot"));
  if (!hit.length) throw new BodyGraphError("missing-socket", `this body has no "${socket}"`);
  return hit;
}

function replace(s: OpState, op: Extract<CreatureOp, { op: "replace" }>): OpResult {
  if (!MOTIFS[op.motif]) throw new BodyGraphError("unknown-kind", `motif "${op.motif}"`);
  const targets = targetsOf(s, op.socket).map((n) => n.id);
  s.graph = { ...s.graph, nodes: s.graph.nodes.map((n) => (targets.indexOf(n.id) >= 0 ? { ...n, kind: { motif: op.motif } } : n)) };
  return { targets, added: [], removed: [], detail: `${op.socket} ← ${op.motif}` };
}

const rescaled = (t: Subtree, rootId: string, scale: number): Subtree => ({ ...t, nodes: t.nodes.map((n) => (n.id === rootId ? { ...n, scale } : n)) });

function graft(s: OpState, op: Extract<CreatureOp, { op: "graft" }>): OpResult {
  const donor = expandBody({ family: op.family, seed: s.seed + PROGRAM_TUNING.graftSeedStep * (s.index + 1) });
  const part = resolveSocket(donor, op.part)[0];
  if (!part) throw new BodyGraphError("missing-socket", `a ${op.family} has no "${op.part}" to graft`);
  const donorEdge = parentEdge(donor, part.id)!;
  const tree = subtreeOf(donor, part.id);
  const hosts = resolveSocket(s.graph, op.socket);
  const prefix = `g${s.index + 1}/`;
  const rename = (id: string) => `${prefix}${id}`;
  if (hosts.length === 0) {
    const anchor = GRAFT_ANCHOR[semanticName(op.socket) ?? "limb"];
    const host = resolveSocket(s.graph, "torso")[0] ?? s.graph.nodes.find((n) => n.id === s.graph.root)!;
    const copy = rescaled(cloned(tree, part.id, rename, host.depth + 1), rename(part.id), part.scale * PROGRAM_TUNING.graftScale);
    const edge: PartEdge = { ...donorEdge, from: host.id, socket: anchor.socket, to: rename(part.id), mirror: anchor.mirror || undefined };
    s.graph = { ...s.graph, nodes: [...s.graph.nodes, ...copy.nodes], edges: [...s.graph.edges, edge, ...copy.edges] };
    return { targets: [host.id], added: copy.nodes.map((n) => n.id), removed: [], detail: `${op.part} de ${op.family} injertado en ${host.id}.${anchor.socket}` };
  }
  const added: string[] = [];
  const removed: string[] = [];
  hosts.forEach((h, k) => {
    const old = parentEdge(s.graph, h.id)!;
    const name = (id: string) => `${prefix}${k ? `${k}/` : ""}${id}`;
    const copy = rescaled(cloned(tree, part.id, name, h.depth), name(part.id), h.scale);
    removed.push(...subtreeOf(s.graph, h.id).nodes.map((n) => n.id));
    const rest = without(s.graph, h.id);
    const edge: PartEdge = { ...old, to: copy.nodes[0].id, joint: donorEdge.joint, recursion: donorEdge.recursion ?? old.recursion };
    const at = s.graph.edges.indexOf(old);
    const edges = rest.edges.slice();
    edges.splice(Math.min(at, edges.length), 0, edge);
    s.graph = { ...rest, nodes: [...rest.nodes, ...copy.nodes], edges: [...edges, ...copy.edges] };
    added.push(...copy.nodes.map((n) => n.id));
  });
  return { targets: hosts.map((h) => h.id), added, removed, detail: `${op.socket} ← ${op.part} de ${op.family} (${kindName(part.kind)})` };
}

function repeat(s: OpState, op: Extract<CreatureOp, { op: "repeat" }>): OpResult {
  if (!Number.isInteger(op.count) || op.count < 2 || op.count > PROGRAM_TUNING.countMax) throw new BodyGraphError("bad-count", `count=${op.count} outside 2..${PROGRAM_TUNING.countMax}`);
  const targets = targetsOf(s, op.socket).filter((n) => n.id !== s.graph.root);
  if (!targets.length) throw new BodyGraphError("missing-socket", `the root cannot repeat`);
  const added: string[] = [];
  for (const t of targets) {
    const e = parentEdge(s.graph, t.id)!;
    if (op.arrangement === "chain") {
      const times = Math.min(BODY_TUNING.maxRecursion, (e.recursion?.times ?? 1) + op.count - 1);
      const chained: PartEdge = { ...e, recursion: { ...PROGRAM_TUNING.chain, ...e.recursion, times } };
      s.graph = { ...s.graph, edges: s.graph.edges.map((x) => (x === e ? chained : x)) };
      continue;
    }
    const tree = subtreeOf(s.graph, t.id);
    for (let k = 1; k < op.count; k++) {
      const copy = cloned(tree, t.id, (id) => `${id}*${k + 1}`, t.depth);
      const edge: PartEdge = op.arrangement === "radial"
        ? { ...e, to: copy.nodes[0].id, angle: (e.angle ?? 0) + (360 * k) / op.count }
        : { ...e, to: copy.nodes[0].id, mirror: true, angle: (e.angle ?? 0) + PROGRAM_TUNING.bilateral.turn * k, offset: [(e.offset?.[0] ?? 0), (e.offset?.[1] ?? 0) + PROGRAM_TUNING.bilateral.step * k] };
      s.graph = { ...s.graph, nodes: [...s.graph.nodes, ...copy.nodes], edges: [...s.graph.edges, edge, ...copy.edges] };
      for (const n of copy.nodes) {
        const from = n.id.replace(/\*\d+$/, "");
        if (s.grammars[from]) s.grammars[n.id] = s.grammars[from];
      }
      added.push(...copy.nodes.map((n) => n.id));
    }
    if (op.arrangement === "bilateral" && !e.mirror) s.graph = { ...s.graph, edges: s.graph.edges.map((x) => (x === e ? { ...e, mirror: true } : x)) };
  }
  return { targets: targets.map((n) => n.id), added, removed: [], detail: `${op.socket} ×${op.count} en ${op.arrangement}` };
}

function architecturalize(s: OpState, op: Extract<CreatureOp, { op: "architecturalize" }>): OpResult {
  if (!PROGRAM_TUNING.grammars[op.grammar]) throw new BodyGraphError("unknown-grammar", String(op.grammar));
  const targets = targetsOf(s, op.socket).map((n) => n.id);
  for (const id of targets) s.grammars[id] = op.grammar;
  return { targets, added: [], removed: [], detail: `${op.socket} → ${PROGRAM_TUNING.grammars[op.grammar]}` };
}

export function applyOp(s: OpState, op: CreatureOp): OpResult {
  if (op.op === "replace") return replace(s, op);
  if (op.op === "graft") return graft(s, op);
  if (op.op === "repeat") return repeat(s, op);
  if (op.op === "architecturalize") return architecturalize(s, op);
  throw new BodyGraphError("unknown-op", String((op as { op: unknown }).op));
}
