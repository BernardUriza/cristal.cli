import type { Stance } from "../terminal/psych/StanceClassifier";
import { isEvasiveStance } from "../terminal/psych/stanceUtils";
import { clamp01 } from "../shared/math";

export interface RelationshipSnapshot {
  trust: number;
  resistance: number;
  curiosity: number;
  avoidance: number;
  ritualDepth: number;
  interactionCount: number;
  lastStance: Stance | null;
  avoidanceStreak: number;
}

export interface RelationshipInteraction {
  stance: Stance;
  pressure: number;
  exploredNewRoom?: boolean;
  revisitedRoom?: boolean;
}

export type SerializedRelationship = RelationshipSnapshot;

const INITIAL_RELATIONSHIP: RelationshipSnapshot = {
  trust: 0.18,
  resistance: 0.12,
  curiosity: 0.2,
  avoidance: 0.1,
  ritualDepth: 0,
  interactionCount: 0,
  lastStance: null,
  avoidanceStreak: 0,
};

function normalizeSnapshot(snapshot: Partial<RelationshipSnapshot>): RelationshipSnapshot {
  return {
    trust: clamp01(snapshot.trust ?? INITIAL_RELATIONSHIP.trust),
    resistance: clamp01(snapshot.resistance ?? INITIAL_RELATIONSHIP.resistance),
    curiosity: clamp01(snapshot.curiosity ?? INITIAL_RELATIONSHIP.curiosity),
    avoidance: clamp01(snapshot.avoidance ?? INITIAL_RELATIONSHIP.avoidance),
    ritualDepth: clamp01(snapshot.ritualDepth ?? INITIAL_RELATIONSHIP.ritualDepth),
    interactionCount: Math.max(0, Math.round(snapshot.interactionCount ?? 0)),
    lastStance: snapshot.lastStance ?? null,
    avoidanceStreak: Math.max(0, Math.round(snapshot.avoidanceStreak ?? 0)),
  };
}

export class RelationshipTracker {
  private state: RelationshipSnapshot;

  constructor(initial?: Partial<RelationshipSnapshot>) {
    this.state = normalizeSnapshot(initial ?? INITIAL_RELATIONSHIP);
  }

  recordInteraction(interaction: RelationshipInteraction): RelationshipSnapshot {
    const pressure = clamp01(interaction.pressure);
    const evasive = isEvasiveStance(interaction.stance);
    const avoidanceStreak = evasive ? this.state.avoidanceStreak + 1 : 0;
    const repeat = evasive && interaction.stance === this.state.lastStance;
    const confession = interaction.stance === "confession";
    const ritual = interaction.stance === "ritualization";
    const novelty = interaction.exploredNewRoom ? 1 : interaction.revisitedRoom ? -0.5 : 0;

    const next: RelationshipSnapshot = {
      trust: clamp01(
        this.state.trust +
          (confession ? 0.035 : 0) +
          (ritual ? 0.014 : 0) -
          (repeat ? 0.008 : 0) -
          pressure * 0.006
      ),
      resistance: clamp01(
        this.state.resistance +
          (evasive ? 0.018 : -0.01) +
          Math.min(0.04, avoidanceStreak * 0.004) +
          pressure * 0.006
      ),
      curiosity: clamp01(
        this.state.curiosity +
          novelty * 0.025 +
          (confession ? 0.012 : 0) +
          (interaction.stance === "intellectualization" ? 0.006 : 0) -
          (repeat ? 0.012 : 0)
      ),
      avoidance: clamp01(
        this.state.avoidance +
          (evasive ? 0.018 : -0.014) +
          (repeat ? 0.012 : 0) +
          pressure * 0.004
      ),
      ritualDepth: clamp01(
        this.state.ritualDepth + (ritual ? 0.032 : -0.006) + (confession ? 0.004 : 0)
      ),
      interactionCount: this.state.interactionCount + 1,
      lastStance: interaction.stance,
      avoidanceStreak,
    };

    this.state = next;
    return this.snapshot();
  }

  snapshot(): RelationshipSnapshot {
    return { ...this.state };
  }

  serialize(): SerializedRelationship {
    return this.snapshot();
  }
}

export function deserializeRelationship(
  serialized: Partial<SerializedRelationship>
): RelationshipTracker {
  return new RelationshipTracker(serialized);
}
