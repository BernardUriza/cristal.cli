import type { BodyGraph, PartNode } from "../types.ts";
import { SEMANTIC_SOCKETS, type SemanticSocket } from "./types.ts";

const ALIASES: Record<string, SemanticSocket> = {
  cabeza: "head", cuerpo: "torso", tronco: "torso", cola: "tail", brazo: "arm", brazos: "arm", pierna: "leg", piernas: "leg",
  extremidad: "limb", mano: "hand", manos: "hand", pie: "foot", pies: "foot", ojo: "eye", ojos: "eye",
};

const NODE_BASES: Record<string, SemanticSocket> = { ...ALIASES, head: "head", torso: "torso", tail: "tail", hand: "hand", foot: "foot", eye: "eye" };

const FALLBACK: Partial<Record<SemanticSocket, SemanticSocket>> = { arm: "hand", leg: "foot" };

export function semanticName(name: string): SemanticSocket | undefined {
  const n = name.trim().toLowerCase();
  return (SEMANTIC_SOCKETS as readonly string[]).indexOf(n) >= 0 ? (n as SemanticSocket) : ALIASES[n];
}

export const baseOf = (id: string): string => id.split("/").slice(-1)[0].replace(/\*\d+$/, "").replace(/-\d+$/, "");

export function semanticOf(n: PartNode): SemanticSocket | undefined {
  const base = baseOf(n.id);
  if (base === "limb") return n.role === "span" ? "arm" : n.role === "support" ? "leg" : "limb";
  return NODE_BASES[base];
}

/** Every node that answers to a semantic socket name, in graph order; arm/leg fall back to hand/foot on bodies that only have those. */
export function resolveSocket(g: Pick<BodyGraph, "nodes" | "root">, name: string): PartNode[] {
  const s = semanticName(name);
  if (!s) return [];
  const hit = g.nodes.filter((n) => {
    const m = semanticOf(n);
    return m === s || (s === "limb" && (m === "arm" || m === "leg"));
  });
  if (hit.length || !FALLBACK[s]) return hit;
  return resolveSocket(g, FALLBACK[s]!);
}

export const GRAFT_ANCHOR: Record<SemanticSocket, { socket: string; mirror: boolean }> = {
  head: { socket: "top", mirror: false },
  torso: { socket: "center", mirror: false },
  tail: { socket: "right", mirror: false },
  arm: { socket: "right", mirror: true },
  leg: { socket: "bottom", mirror: true },
  limb: { socket: "right", mirror: true },
  hand: { socket: "right", mirror: true },
  foot: { socket: "bottom", mirror: true },
  eye: { socket: "center", mirror: true },
};
