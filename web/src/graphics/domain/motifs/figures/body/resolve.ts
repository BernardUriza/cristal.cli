import type { Rng } from "../../../../../shared/rng.ts";
import { polygonBounds } from "../../../bezier.ts";
import type { Shape, Vec2 } from "../../../shapes.ts";
import { renamePart, type Part } from "../parts.ts";
import type { MotifParams } from "../types.ts";
import { attach, ROOT_FRAME, toWorld, type BodyFrame } from "./frame.ts";
import { drawKind, kindName, socketNamed, unitPolygon } from "./kinds.ts";
import { BODY_TUNING } from "./tuning.ts";
import type { BodyGraph, PartEdge, PartNode } from "./types.ts";

export type BodyPiece = { node: string; instance: string; part: Part; shapes: Shape[] };

export type EdgeTrace = { edge: string; joint: string; instances: string[]; mirrored: boolean; copies: number };

export type ResolvedBody = { shapes: Shape[]; pieces: BodyPiece[]; edges: EdgeTrace[] };

type Placed = { node: PartNode; name: string; frame: BodyFrame };

type Walk = { graph: BodyGraph; byId: Map<string, PartNode>; out: Placed[]; traces: Map<string, EdgeTrace> };

const pieceName = (n: PartNode, suffix: string, copy: string): string => `${n.id}${suffix}${copy}:${kindName(n.kind)}`;

function trace(w: Walk, e: PartEdge, name: string): void {
  const key = `${e.from}.${e.socket}→${e.to}`;
  const t = w.traces.get(key) ?? { edge: key, joint: e.joint, instances: [], mirrored: Boolean(e.mirror), copies: e.recursion?.times ?? 1 };
  t.instances.push(name);
  w.traces.set(key, t);
}

function chain(w: Walk, e: PartEdge, parent: PartNode, pf: BodyFrame, suffix: string): void {
  const child = w.byId.get(e.to)!;
  const joint = socketNamed(child.kind, e.joint)!;
  const r = e.recursion;
  const times = r?.times ?? 1;
  let f = attach(pf, socketNamed(parent.kind, e.socket)!, joint, child.scale, e.offset, e.angle);
  for (let k = 0; k < times; k++) {
    if (k > 0 && r) f = attach(f, socketNamed(child.kind, r.via ?? "bottom")!, joint, r.scale, e.offset, r.turn * (r.wave && Math.floor((k - 1) / r.wave) % 2 === 1 ? -1 : 1));
    const copy = times > 1 ? `~${k + 1}` : "";
    trace(w, e, pieceName(child, suffix, copy));
    if (k < times - 1) w.out.push({ node: child, name: pieceName(child, suffix, copy), frame: f });
    else place(w, child, f, suffix, copy);
  }
}

function place(w: Walk, node: PartNode, f: BodyFrame, suffix: string, copy: string): void {
  const outgoing = w.graph.edges.filter((e) => e.from === node.id);
  const branch = (e: PartEdge) => {
    if (!e.mirror) return chain(w, e, node, e.flip ? { ...f, flip: !f.flip } : f, suffix);
    chain(w, e, node, { ...f, flip: !f.flip }, `${suffix}1`);
    chain(w, e, node, f, `${suffix}2`);
  };
  outgoing.filter((e) => e.behind).forEach(branch);
  w.out.push({ node, name: pieceName(node, suffix, copy), frame: f });
  outgoing.filter((e) => !e.behind).forEach(branch);
}

export function layoutBody(graph: BodyGraph): { placed: Placed[]; edges: EdgeTrace[] } {
  const w: Walk = { graph, byId: new Map(graph.nodes.map((n) => [n.id, n])), out: [], traces: new Map() };
  place(w, w.byId.get(graph.root)!, ROOT_FRAME, "", "");
  return { placed: w.out, edges: [...w.traces.values()] };
}

function fitTo(graph: BodyGraph, placed: Placed[], foot: Vec2, heightPx: number): (f: BodyFrame) => BodyFrame {
  let k = heightPx, ax = 0, ay = 0;
  const pts = placed.flatMap((p) => unitPolygon(p.node.kind).map((q) => toWorld(p.frame, q)));
  if (graph.fit === "bounds" && pts.length) {
    const b = polygonBounds(pts);
    k = heightPx / Math.max(b.maxY - b.minY, (b.maxX - b.minX) / BODY_TUNING.fitAspect, 1e-6);
    ax = (b.minX + b.maxX) / 2;
    ay = b.maxY;
  }
  return (f) => ({ ...f, o: [foot[0] + k * (f.o[0] - ax), foot[1] + k * (f.o[1] - ay)], s: k * f.s });
}

export function resolveBody(graph: BodyGraph, footX: number, footY: number, heightPx: number, params: Omit<MotifParams, "size">, rng: Rng): ResolvedBody {
  const { placed, edges } = layoutBody(graph);
  const map = fitTo(graph, placed, [footX, footY], heightPx);
  const pieces: BodyPiece[] = [];
  for (const p of placed) {
    const drawn = drawKind(p.node.kind, p.node.role, map(p.frame), params, rng);
    if (drawn) pieces.push({ node: p.node.id, instance: p.name, part: renamePart(drawn.part, p.name), shapes: drawn.shapes });
  }
  return { shapes: pieces.flatMap((p) => p.shapes), pieces, edges };
}
