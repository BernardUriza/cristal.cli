import type { StructuralRole } from "../parts.ts";
import type { BodyContext, BodySlot, PartEdge, PartKind, PartNode } from "./types.ts";

export function partOf(ctx: BodyContext, slot: BodySlot, role: StructuralRole, scale: number, parent: PartNode, kind: PartKind = ctx.kind(slot)): PartNode {
  return { id: ctx.nextId(slot), kind, role, scale, depth: parent.depth + 1 };
}

export function joined(from: PartNode, socket: string, to: PartNode, joint: string, extra: Partial<PartEdge> = {}): PartEdge {
  return { from: from.id, socket, to: to.id, joint, ...extra };
}

export const between = (ctx: BodyContext, min: number, max: number): number => min + Math.floor(ctx.rng() * (max - min + 1));

export const within = (ctx: BodyContext, min: number, max: number): number => min + ctx.rng() * (max - min);
