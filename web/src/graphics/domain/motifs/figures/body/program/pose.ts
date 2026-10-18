import { layoutBody } from "../resolve.ts";
import type { BodyGraph, BodyPose, HeldPose, PartEdge, PartNode } from "../types.ts";
import { semanticOf } from "./sockets.ts";

type Graph = Pick<BodyGraph, "root" | "nodes" | "edges" | "tilt">;

const SEGMENT: Record<string, keyof Pick<BodyPose, "arm" | "leg" | "head">> = { arm: "arm", leg: "leg", head: "head" };

function rescaled(g: Graph, pose: BodyPose): PartNode[] {
  const byId = new Map(g.nodes.map((n) => [n.id, n]));
  const parentOf = new Map(g.edges.map((e) => [e.to, byId.get(e.from)!]));
  const factor = (n: PartNode | undefined) => (n && SEGMENT[semanticOf(n) ?? ""] ? pose[SEGMENT[semanticOf(n)!]] : 1);
  return g.nodes.map((n) => ({ ...n, scale: Number(((n.scale * factor(n)) / factor(parentOf.get(n.id))).toFixed(3)) }));
}

function turned(e: PartEdge, to: PartNode | undefined, from: PartNode | undefined, pose: BodyPose, tilt: number): PartEdge {
  const s = to && semanticOf(to), parent = from && semanticOf(from);
  const add = (angle: number, skew: number): PartEdge => ({ ...e, angle: Number(((e.angle ?? 0) + angle).toFixed(2)), ...(e.mirror && skew ? { skew: Number(((e.skew ?? 0) + skew).toFixed(2)) } : {}) });
  if (s === "arm") return add(pose.shoulder, pose.armSkew);
  if (s === "leg") return add(pose.hip - (e.mirror ? 0 : tilt), pose.legSkew + tilt);
  if (s === "hand" && parent === "arm") return add(pose.wrist, 0);
  return e;
}

function heldEdge(g: Graph, held: HeldPose): { node: PartNode; edge: PartEdge } | undefined {
  const arm = g.edges.find((e) => e.from === g.root && semanticOf(g.nodes.find((n) => n.id === e.to)!) === "arm");
  if (!arm) return undefined;
  const hand = g.edges.find((e) => e.from === arm.to && semanticOf(g.nodes.find((n) => n.id === e.to)!) === "hand");
  const grip = g.nodes.find((n) => n.id === (hand ? hand.to : arm.to))!;
  const sided = arm.mirror ? held.side : undefined;
  const placed = layoutBody(g).placed;
  const at = placed.find((p) => p.node.id === grip.id && (!sided || p.name.startsWith(`${grip.id}${sided}`))) ?? placed.find((p) => p.node.id === grip.id);
  if (!at) return undefined;
  const angle = at.frame.flip ? at.frame.rot - held.angle : held.angle - at.frame.rot;
  const node: PartNode = { id: "objeto-1", kind: { primitive: held.kind }, role: "connector", scale: held.scale, depth: grip.depth + 1 };
  return { node, edge: { from: grip.id, socket: "center", to: node.id, joint: "center", angle: Number(angle.toFixed(2)), behind: true, ...(sided ? { side: sided } : {}) } };
}

/** One member's posture over its laid-out body: joints turned, segments lengthened, torso tilted with the legs kept under it, and maybe one object held in one hand. */
export function posed<G extends Graph>(g: G, pose: BodyPose): G {
  const byId = new Map(g.nodes.map((n) => [n.id, n]));
  const tilt = pose.tilt;
  const edges = g.edges.map((e) => turned(e, byId.get(e.to), byId.get(e.from), pose, tilt));
  const out: G = { ...g, nodes: rescaled(g, pose), edges, tilt: Number(((g.tilt ?? 0) + tilt).toFixed(2)) };
  const held = pose.held && heldEdge(out, pose.held);
  return held ? { ...out, nodes: [...out.nodes, held.node], edges: [...out.edges, held.edge] } : out;
}
