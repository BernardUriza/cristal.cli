import { clamp01 } from "../shared/math";
import type { SymbolicArchetype } from "./symbolicBus";
import type { TransferenceProfile } from "./PersistentTransference";

export interface RitualObservation {
  archetype: SymbolicArchetype;
  intensity: number;
}

export interface RitualGravityInput {
  observations: readonly RitualObservation[];
  profile: TransferenceProfile;
}

export interface RitualGravity {
  archetypeBias: Record<SymbolicArchetype, number>;
  reflectionBias: number;
  thresholdBias: number;
  maxInfluence: number;
}

const ARCHETYPES: readonly SymbolicArchetype[] = [
  "fragment",
  "echo",
  "corruption",
  "memory",
  "moon",
  "gate",
  "vision",
];

function emptyBias(): Record<SymbolicArchetype, number> {
  return {
    fragment: 1,
    echo: 1,
    corruption: 1,
    memory: 1,
    moon: 1,
    gate: 1,
    vision: 1,
  };
}

export function resolveRitualGravity(input: RitualGravityInput): RitualGravity {
  const totals = new Map<SymbolicArchetype, number>();
  let total = 0;
  for (const observation of input.observations.slice(-32)) {
    const intensity = clamp01(observation.intensity);
    totals.set(observation.archetype, (totals.get(observation.archetype) ?? 0) + intensity);
    total += intensity;
  }

  const maxInfluence = Math.min(0.18, 0.04 + input.profile.ritualAffinity * 0.12);
  const archetypeBias = emptyBias();
  for (const archetype of ARCHETYPES) {
    const share = total === 0 ? 0 : (totals.get(archetype) ?? 0) / total;
    archetypeBias[archetype] = 1 + share * maxInfluence;
  }

  const moonShare = total === 0 ? 0 : (totals.get("moon") ?? 0) / total;
  const gateShare = total === 0 ? 0 : (totals.get("gate") ?? 0) / total;

  return {
    archetypeBias,
    reflectionBias: 1 + moonShare * maxInfluence,
    thresholdBias: 1 + gateShare * maxInfluence,
    maxInfluence,
  };
}
