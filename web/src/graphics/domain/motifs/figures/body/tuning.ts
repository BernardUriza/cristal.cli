import type { StructuralRole } from "../parts.ts";
import type { BodyFamily, BodySlot, PartKind } from "./types.ts";

export type BodyTuning = { budget: number; maxDepth: number; maxRecursion: number; fitAspect: number; inkRatio: number; restWeight: number };

export const BODY_TUNING: BodyTuning = { budget: 40, maxDepth: 4, maxRecursion: 10, fitAspect: 1.24, inkRatio: 0.012, restWeight: 1 };

const ALL: readonly StructuralRole[] = ["support", "span", "enclosure", "opening", "crown", "connector"];

export const SOCKET_ACCEPTS: Record<string, readonly StructuralRole[]> = {
  center: ALL,
  top: ["crown", "connector", "span", "opening"],
  bottom: ["support", "connector", "span"],
  left: ["span", "support", "connector", "crown"],
  right: ["span", "support", "connector", "crown"],
};

export const SUBPART_ACCEPTS: Record<"opening" | "other", readonly StructuralRole[]> = {
  opening: ["opening", "crown", "connector"],
  other: ["connector", "span", "support"],
};

const capsule: PartKind = { primitive: "capsule" };

export const SLOT_DEFAULTS: Record<BodyFamily, Record<BodySlot, PartKind>> = {
  biped: { torso: { motif: "mascara" }, head: { motif: "craneo" }, limb: capsule, hand: { motif: "mano" }, foot: { primitive: "barrel" }, tail: capsule, eye: { motif: "ojo" } },
  quadruped: { torso: { primitive: "barrel" }, head: { motif: "mascara" }, limb: capsule, hand: { primitive: "spike" }, foot: { primitive: "barrel" }, tail: capsule, eye: { motif: "ojo" } },
  serpentine: { torso: { primitive: "disc" }, head: { motif: "craneo" }, limb: capsule, hand: { primitive: "spike" }, foot: { primitive: "spike" }, tail: { primitive: "disc" }, eye: { motif: "ojo" } },
  radial: { torso: { motif: "ojo" }, head: { motif: "ojo" }, limb: capsule, hand: { motif: "mano" }, foot: { primitive: "spike" }, tail: capsule, eye: { motif: "ojo" } },
  chimera: { torso: capsule, head: capsule, limb: capsule, hand: { primitive: "spike" }, foot: { primitive: "barrel" }, tail: capsule, eye: { motif: "ojo" } },
};

export const CHIMERIC_SLOTS: readonly BodySlot[] = ["torso", "head", "hand", "foot", "eye"];

export type SixSlot = "cabeza" | "ojos" | "cuerpo" | "manos" | "cola" | "pies";

export type SixSlotEntry = { part: SixSlot; dx: number; dy: number; size: number; pair?: number };

export const SIX_SLOT_PLAN: readonly SixSlotEntry[] = [
  { part: "cola", dx: 0.34, dy: -0.32, size: 0.32 },
  { part: "pies", dx: 0, dy: -0.08, size: 0.2, pair: 0.14 },
  { part: "cuerpo", dx: 0, dy: -0.42, size: 0.55 },
  { part: "manos", dx: 0.36, dy: -0.5, size: 0.24, pair: 0.36 },
  { part: "cabeza", dx: 0, dy: -0.86, size: 0.36 },
  { part: "ojos", dx: 0, dy: -0.9, size: 0.12, pair: 0.08 },
];

export const SIX_SLOT_ALONE = { dy: -0.5, size: 0.9 };

export const SIX_SLOT_ROLE: Partial<Record<SixSlot, StructuralRole>> = { cuerpo: "enclosure", cabeza: "crown", pies: "support", manos: "span" };
