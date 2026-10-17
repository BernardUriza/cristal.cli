import { kindExists, kindName, socketNamed } from "./kinds.ts";
import { BODY_TUNING } from "./tuning.ts";
import { BodyGraphError, type BodyGraph, type PartEdge, type PartNode } from "./types.ts";

type Shape = Pick<BodyGraph, "root" | "nodes" | "edges">;

function checkEdge(e: PartEdge, from: PartNode, to: PartNode): void {
  const where = `${e.from}.${e.socket} → ${e.to}`;
  const socket = socketNamed(from.kind, e.socket);
  if (!socket) throw new BodyGraphError("unknown-socket", `${kindName(from.kind)} has no socket "${e.socket}" (${where})`);
  if (!socketNamed(to.kind, e.joint)) throw new BodyGraphError("unknown-socket", `${kindName(to.kind)} has no joint "${e.joint}" (${where})`);
  if (socket.accepts.indexOf(to.role) < 0) throw new BodyGraphError("incompatible-role", `${where}: socket ${e.socket} accepts ${socket.accepts.join("|")}, ${to.id} is ${to.role}`);
  const r = e.recursion;
  if (!r) return;
  if (!Number.isInteger(r.times) || r.times < 1 || r.times > BODY_TUNING.maxRecursion) throw new BodyGraphError("bad-recursion", `${where}: times=${r.times} outside 1..${BODY_TUNING.maxRecursion}`);
  if (!(r.scale > 0 && r.scale <= 1)) throw new BodyGraphError("bad-recursion", `${where}: scale=${r.scale} must be in (0, 1]`);
  if (r.via !== undefined && !socketNamed(to.kind, r.via)) throw new BodyGraphError("unknown-socket", `${kindName(to.kind)} has no recursion socket "${r.via}" (${where})`);
}

function checkTree(g: Shape, byId: Map<string, PartNode>): void {
  const parents = new Map<string, string>();
  for (const e of g.edges) {
    if (parents.has(e.to)) throw new BodyGraphError("shared-child", `${e.to} hangs from ${parents.get(e.to)} and ${e.from}`);
    parents.set(e.to, e.from);
  }
  for (const id of byId.keys()) {
    const seen = [id];
    for (let p = parents.get(id); p !== undefined; p = parents.get(p)) {
      if (seen.indexOf(p) >= 0) throw new BodyGraphError("cycle", [...seen, p].join(" ← "));
      seen.push(p);
    }
    if (seen[seen.length - 1] !== g.root) throw new BodyGraphError("orphan", `${id} does not reach the root ${g.root}`);
  }
}

export function instanceCount(g: Shape): number {
  const pivots = new Set(g.nodes.filter((n) => "primitive" in n.kind && n.kind.primitive === "pivot").map((n) => n.id));
  const count = (id: string): number =>
    (pivots.has(id) ? 0 : 1) + g.edges.filter((e) => e.from === id).reduce((sum, e) => sum + (e.mirror ? 2 : 1) * ((e.recursion?.times ?? 1) - 1 + count(e.to)), 0);
  return count(g.root);
}

export function validateBody(g: Shape, budget = BODY_TUNING.budget): void {
  const byId = new Map(g.nodes.map((n) => [n.id, n]));
  if (!byId.has(g.root)) throw new BodyGraphError("unknown-node", `root ${g.root}`);
  for (const n of g.nodes) {
    if (!kindExists(n.kind)) throw new BodyGraphError("unknown-kind", `${n.id} is ${kindName(n.kind)}`);
    if (n.depth > BODY_TUNING.maxDepth) throw new BodyGraphError("depth-exceeded", `${n.id} at depth ${n.depth} (max ${BODY_TUNING.maxDepth})`);
  }
  for (const e of g.edges) {
    const from = byId.get(e.from), to = byId.get(e.to);
    if (!from || !to) throw new BodyGraphError("unknown-node", `${e.from} → ${e.to}`);
    checkEdge(e, from, to);
  }
  checkTree(g, byId);
  const n = instanceCount(g);
  if (n > budget) throw new BodyGraphError("budget-exceeded", `${n} pieces (budget ${budget})`);
}
