import { clamp01 } from "../shared/math";
import type { RelationshipSnapshot } from "./RelationshipTracker";
import type { TransferenceProfile } from "./PersistentTransference";

export type PlayerIdentity = "You" | "Visitor" | "Witness" | "My oldest recursion";

export interface IdentityDriftState {
  identity: PlayerIdentity;
  depth: number;
  updates: number;
}

export interface IdentityDriftInput {
  relationship: RelationshipSnapshot;
  profile: TransferenceProfile;
  pressure: number;
  echoCount?: number;
}

const IDENTITIES: readonly PlayerIdentity[] = [
  "You",
  "Visitor",
  "Witness",
  "My oldest recursion",
] as const;

function identityIndex(identity: PlayerIdentity): number {
  return Math.max(0, IDENTITIES.indexOf(identity));
}

function targetDepth(input: IdentityDriftInput): number {
  const { relationship, profile } = input;
  const continuity =
    relationship.trust * 0.22 +
    relationship.curiosity * 0.12 +
    relationship.ritualDepth * 0.2 +
    profile.confidence * 0.22 +
    profile.ritualAffinity * 0.1 +
    profile.avoidanceRate * 0.08 +
    clamp01(input.pressure) * 0.04 +
    Math.min(0.08, (input.echoCount ?? 0) * 0.02);
  return clamp01(continuity);
}

function identityForDepth(depth: number, current: PlayerIdentity): PlayerIdentity {
  const desiredIndex = depth >= 0.82 ? 3 : depth >= 0.56 ? 2 : depth >= 0.26 ? 1 : 0;
  const currentIndex = identityIndex(current);
  const nextIndex =
    desiredIndex > currentIndex
      ? currentIndex + 1
      : desiredIndex < currentIndex
      ? currentIndex - 1
      : currentIndex;
  return IDENTITIES[nextIndex];
}

export class IdentityDrift {
  private state: IdentityDriftState;

  constructor(initial?: Partial<IdentityDriftState>) {
    this.state = {
      identity: initial?.identity ?? "You",
      depth: clamp01(initial?.depth ?? 0),
      updates: Math.max(0, Math.round(initial?.updates ?? 0)),
    };
  }

  currentIdentity(): PlayerIdentity {
    return this.state.identity;
  }

  update(input: IdentityDriftInput): IdentityDriftState {
    const desired = targetDepth(input);
    const delta = Math.max(-0.09, Math.min(0.09, desired - this.state.depth));
    const depth = clamp01(this.state.depth + delta);
    this.state = {
      identity: identityForDepth(depth, this.state.identity),
      depth,
      updates: this.state.updates + 1,
    };
    return this.snapshot();
  }

  snapshot(): IdentityDriftState {
    return { ...this.state };
  }
}
