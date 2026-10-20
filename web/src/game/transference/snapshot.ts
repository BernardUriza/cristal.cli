import type { AbsencePlan } from "../AbsencePlanner";
import type { EmotionalSeasonState } from "../EmotionalSeason";
import type { IdentityDriftState } from "../IdentityDrift";
import type { EchoFragment } from "../MemoryEchoEngine";
import type { TransferenceProfile } from "../PersistentTransference";
import type { RelationshipSnapshot } from "../RelationshipTracker";
import type { RitualGravity } from "../RitualGravity";
import type { WorldBehavior } from "../WorldBehaviorResolver";
import type { WorldConfidenceState } from "../WorldConfidence";

export interface RuntimeTransferenceSnapshot {
  profile: TransferenceProfile;
  relationship: RelationshipSnapshot;
  worldBehavior: WorldBehavior | null;
  memoryEchoes: EchoFragment[];
  identity: IdentityDriftState;
  emotionalSeason: EmotionalSeasonState;
  ritualGravity: RitualGravity;
  absencePlan: AbsencePlan;
  narrativeReflection: string | null;
  worldConfidence: WorldConfidenceState;
  saveMetadata: {
    identity: string;
    confidence: number;
    updatedAt: number;
  };
}
