import { unitHash } from "../../shared/rng";
import type { SymbolicArchetype } from "../../shared/archetype";
import type { RitualGravity } from "../RitualGravity";
import type { Room } from "../roomApi";
import type { SafeExit } from "../SafeExitResolver";
import type { WorldBehavior } from "../WorldBehaviorResolver";

export function shouldOfferSafeExit(
  room: Room,
  safeExit: SafeExit | null,
  behavior: WorldBehavior | null
): safeExit is SafeExit {
  if (!safeExit) return false;
  if (!behavior) return true;
  return unitHash(room.seed, 131) < behavior.safeExitProbability;
}

export function shouldFalseDoorBite(room: Room, index: number, candidateIndex: number, behavior: WorldBehavior | null): boolean {
  if (index !== candidateIndex || candidateIndex < 0) return false;
  if (!behavior) return true;
  return unitHash(room.seed + index, 149) < Math.max(0.08, behavior.falseDoorProbability);
}

export function symbolicSeedBias(archetype: SymbolicArchetype, gravity: RitualGravity): number {
  const bias = gravity.archetypeBias[archetype] ?? 1;
  return Math.round((bias - 1) * 1000 + (gravity.thresholdBias - 1) * 997);
}

export function terminalSilenceRoll(turn: number): number {
  return unitHash(turn, 71);
}

export function terminalEchoRoll(turn: number, intensity: number): number {
  return unitHash(turn + Math.round(intensity * 100), 97);
}
