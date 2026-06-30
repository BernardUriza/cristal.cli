import { clamp01 } from "../shared/math";
import type { RelationshipSnapshot } from "./RelationshipTracker";
import type { TransferenceProfile } from "./PersistentTransference";
import { WORLD_NODES, type WorldNode } from "./worldNodes";

export type AbsenceKind = "console" | "glyph" | "sentence";

export interface AbsencePlanItem {
  kind: AbsenceKind;
  id: string;
  reason: string;
  intensity: number;
}

export interface AbsencePlan {
  omissions: AbsencePlanItem[];
  explanation: string;
}

export interface AbsencePlannerInput {
  roomSeed: number;
  relationship: RelationshipSnapshot;
  profile: TransferenceProfile;
  availableNodes?: readonly WorldNode[];
  sentenceCount?: number;
}

function deterministicSlot(seed: number, salt: number, size: number): number {
  if (size <= 0) return -1;
  let value = (seed ^ Math.imul(salt, 0x9e3779b1)) >>> 0;
  value = Math.imul(value ^ (value >>> 16), 0x45d9f3b) >>> 0;
  return (value ^ (value >>> 16)) % size;
}

export function planAbsence(input: AbsencePlannerInput): AbsencePlan {
  const nodes = input.availableNodes ?? WORLD_NODES;
  const consoles = nodes.filter((node) => node.kind === "console");
  const glyphs = nodes.filter((node) => node.kind === "glyph");
  const omissions: AbsencePlanItem[] = [];
  const avoidanceWeight = clamp01(input.profile.avoidanceRate * 0.55 + input.relationship.avoidance * 0.35);
  const silenceWeight = clamp01(input.profile.silenceTolerance * 0.5 + input.relationship.resistance * 0.25);
  const ritualWeight = clamp01(input.profile.ritualAffinity * 0.45 + input.relationship.ritualDepth * 0.35);

  if (avoidanceWeight > 0.36 && consoles.length > 0) {
    const node = consoles[deterministicSlot(input.roomSeed, 11, consoles.length)];
    omissions.push({
      kind: "console",
      id: node.id,
      reason: "The labyrinth withholds a terminal where avoidance usually becomes explanation.",
      intensity: avoidanceWeight,
    });
  }

  if (ritualWeight > 0.42 && glyphs.length > 0) {
    const node = glyphs[deterministicSlot(input.roomSeed, 23, glyphs.length)];
    omissions.push({
      kind: "glyph",
      id: node.id,
      reason: "A symbol is missing because repetition has made the symbol too easy.",
      intensity: ritualWeight,
    });
  }

  if (silenceWeight > 0.38 && (input.sentenceCount ?? 1) > 0) {
    omissions.push({
      kind: "sentence",
      id: `sentence_${deterministicSlot(input.roomSeed, 37, Math.max(1, input.sentenceCount ?? 1))}`,
      reason: "The room answers with an omitted sentence instead of another prompt.",
      intensity: silenceWeight,
    });
  }

  return {
    omissions: omissions.sort((a, b) => b.intensity - a.intensity).slice(0, 3),
    explanation:
      omissions.length === 0
        ? "Nothing is missing because the relationship has not made absence legible yet."
        : "Absence is being used as communication, not as loot or failure.",
  };
}
