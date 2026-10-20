import type { Stance } from "../terminal/psych/StanceClassifier";
import { shapeTerminalResponses, type ResponseContext } from "../terminal/responseShaper";
import { clamp01 } from "../shared/math";
import { planAbsence, type AbsencePlan } from "./AbsencePlanner";
import { resolveEmotionalSeason, type EmotionalSeasonState } from "./EmotionalSeason";
import type { EmotionalHistoryEntry } from "./EmotionalHistory";
import { IdentityDrift } from "./IdentityDrift";
import { generateMemoryEchoes } from "./MemoryEchoEngine";
import { compressNarrative } from "./NarrativeCompression";
import {
  createPersistentTransference,
  type PersistentTransferenceApi,
  type TransferenceProfile,
  type TransferenceSessionInput,
  type TransferenceStorage,
} from "./PersistentTransference";
import { RelationshipTracker, type RelationshipSnapshot } from "./RelationshipTracker";
import { resolveRitualGravity, type RitualObservation } from "./RitualGravity";
import { adaptTerminalResponse } from "./transference/terminalAdapter";
import type { RuntimeTransferenceSnapshot } from "./transference/snapshot";
import type { Room } from "./roomApi";
import type { SymbolicEvent } from "./symbolicBus";
import { WORLD_NODES } from "./worldNodes";
import { resolveWorldBehavior, type WorldBehaviorPressure } from "./WorldBehaviorResolver";
import { resolveWorldConfidence } from "./WorldConfidence";

export interface RuntimeInteractionInput {
  stance: Stance;
  pressure: number;
  room: Room | null;
  history: EmotionalHistoryEntry[];
  exploredNewRoom?: boolean;
  revisitedRoom?: boolean;
}

export interface RuntimeRoomInput {
  room: Room;
  pressure: WorldBehaviorPressure;
  history: EmotionalHistoryEntry[];
}

const FALLBACK_PRESSURE_HISTORY = [0];

function initialSeason(profile: TransferenceProfile, relationship: RelationshipSnapshot): EmotionalSeasonState {
  return resolveEmotionalSeason({
    relationship,
    profile,
    pressureHistory: FALLBACK_PRESSURE_HISTORY,
    emotionalHistory: [],
  });
}

function emptyAbsence(): AbsencePlan {
  return planAbsence({
    roomSeed: 1337,
    relationship: new RelationshipTracker().snapshot(),
    profile: createPersistentTransference(null).getTransference(),
    availableNodes: WORLD_NODES,
  });
}

function pressureValue(pressure: WorldBehaviorPressure): number {
  return typeof pressure === "number" ? clamp01(pressure) : clamp01(pressure.pressure);
}

export class RuntimeTransference {
  private readonly persistence: PersistentTransferenceApi;
  private relationship = new RelationshipTracker();
  private identityDrift = new IdentityDrift();
  private observations: RitualObservation[] = [];
  private profile: TransferenceProfile;
  private snapshotState: RuntimeTransferenceSnapshot;
  private terminalTurns = 0;
  private lastEchoTurn = -100;

  constructor(storage?: TransferenceStorage | null) {
    this.persistence = createPersistentTransference(storage);
    this.profile = this.persistence.load();
    const relationship = this.relationship.snapshot();
    const identity = this.identityDrift.update({
      relationship,
      profile: this.profile,
      pressure: 0,
      echoCount: 0,
    });
    this.snapshotState = {
      profile: this.profile,
      relationship,
      worldBehavior: null,
      memoryEchoes: [],
      identity,
      emotionalSeason: initialSeason(this.profile, relationship),
      ritualGravity: resolveRitualGravity({ observations: this.observations, profile: this.profile }),
      absencePlan: emptyAbsence(),
      narrativeReflection: null,
      worldConfidence: resolveWorldConfidence(this.profile),
      saveMetadata: {
        identity: identity.identity,
        confidence: this.profile.confidence,
        updatedAt: Date.now(),
      },
    };
  }

  // INPUT: persisted D2 profile. OUTPUT: current runtime snapshot. SIDE EFFECTS: reads persistent storage.
  bootstrap(): RuntimeTransferenceSnapshot {
    this.profile = this.persistence.load();
    return this.recompute({
      pressure: 0,
      history: [],
      room: null,
      narrativeReflection: this.snapshotState.narrativeReflection,
    });
  }

  snapshot(): RuntimeTransferenceSnapshot {
    return this.snapshotState;
  }

  // INPUT: terminal/world stance event. OUTPUT: updated runtime snapshot. SIDE EFFECTS: advances session relationship/identity.
  recordInteraction(input: RuntimeInteractionInput): RuntimeTransferenceSnapshot {
    const relationship = this.relationship.recordInteraction({
      stance: input.stance,
      pressure: input.pressure,
      exploredNewRoom: input.exploredNewRoom,
      revisitedRoom: input.revisitedRoom,
    });
    return this.recompute({
      pressure: input.pressure,
      history: input.history,
      room: input.room,
      relationship,
      narrativeReflection: this.snapshotState.narrativeReflection,
    });
  }

  // INPUT: active room and current pressure. OUTPUT: updated runtime snapshot. SIDE EFFECTS: none beyond published adapter state.
  enterRoom(input: RuntimeRoomInput): RuntimeTransferenceSnapshot {
    return this.recompute({
      pressure: input.pressure,
      history: input.history,
      room: input.room,
      narrativeReflection: this.snapshotState.narrativeReflection,
    });
  }

  // INPUT: symbolic invocation/progress. OUTPUT: snapshot with only ritual gravity moved. SIDE EFFECTS: remembers bounded symbolic observations this session.
  observeSymbol(event: SymbolicEvent): RuntimeTransferenceSnapshot {
    this.observations = [
      ...this.observations,
      { archetype: event.archetype, intensity: clamp01(event.intensity) },
    ].slice(-32);
    this.snapshotState = {
      ...this.snapshotState,
      ritualGravity: resolveRitualGravity({ observations: this.observations, profile: this.profile }),
    };
    return this.snapshotState;
  }

  // INPUT: completed runtime session. OUTPUT: persisted profile plus narrative paragraph. SIDE EFFECTS: writes persistent profile.
  completeSession(session: TransferenceSessionInput, relationship = this.relationship.snapshot()): RuntimeTransferenceSnapshot {
    const nextProfile =
      session.emotionalHistory.length > 0 ? this.persistence.mergeSession(session) : this.profile;
    this.profile = nextProfile;
    const narrativeReflection = compressNarrative({
      history: session.emotionalHistory,
      relationship,
      profile: nextProfile,
    });
    return this.recompute({
      pressure: session.emotionalHistory[session.emotionalHistory.length - 1]?.pressure ?? 0,
      history: session.emotionalHistory,
      room: null,
      relationship,
      narrativeReflection,
    });
  }

  // INPUT: terminal response lines. OUTPUT: response lines/timing shaped by D2 state. SIDE EFFECTS: advances sparse terminal turn counter.
  adaptTerminalResponse<T extends { lines: string[]; delayMs?: number }>(response: T, context: ResponseContext): T {
    this.terminalTurns += 1;
    const adapted = adaptTerminalResponse(response, context, this.snapshotState, {
      turn: this.terminalTurns,
      lastEchoTurn: this.lastEchoTurn,
    });
    if (adapted.echoed) this.lastEchoTurn = this.terminalTurns;
    return adapted.response;
  }

  reset(): RuntimeTransferenceSnapshot {
    this.persistence.reset();
    this.relationship = new RelationshipTracker();
    this.identityDrift = new IdentityDrift();
    this.observations = [];
    this.terminalTurns = 0;
    this.lastEchoTurn = -100;
    return this.bootstrap();
  }

  private recompute(input: {
    pressure: WorldBehaviorPressure;
    history: EmotionalHistoryEntry[];
    room: Room | null;
    relationship?: RelationshipSnapshot;
    narrativeReflection: string | null;
  }): RuntimeTransferenceSnapshot {
    const relationship = input.relationship ?? this.relationship.snapshot();
    const pressureHistory = input.history.length > 0 ? input.history.map((entry) => entry.pressure) : [pressureValue(input.pressure)];
    const memoryEchoes = generateMemoryEchoes({
      history: input.history,
      relationship,
      profile: this.profile,
      limit: 3,
    });
    const identity = this.identityDrift.update({
      relationship,
      profile: this.profile,
      pressure: pressureValue(input.pressure),
      echoCount: memoryEchoes.length,
    });
    const emotionalSeason = resolveEmotionalSeason({
      relationship,
      profile: this.profile,
      pressureHistory,
      emotionalHistory: input.history,
    });
    const ritualGravity = resolveRitualGravity({
      observations: this.observations,
      profile: this.profile,
    });
    const worldBehavior = input.room ? resolveWorldBehavior(this.profile, input.room, input.pressure) : null;
    const absencePlan = planAbsence({
      roomSeed: input.room?.seed ?? 1337,
      relationship,
      profile: this.profile,
      availableNodes: WORLD_NODES,
      sentenceCount: input.room ? Math.max(1, input.room.inscription.split(/[.!?]+/).filter(Boolean).length) : 1,
    });

    this.snapshotState = {
      profile: this.profile,
      relationship,
      worldBehavior,
      memoryEchoes,
      identity,
      emotionalSeason,
      ritualGravity,
      absencePlan,
      narrativeReflection: input.narrativeReflection,
      worldConfidence: resolveWorldConfidence(this.profile),
      saveMetadata: {
        identity: identity.identity,
        confidence: this.profile.confidence,
        updatedAt: Date.now(),
      },
    };
    return this.snapshotState;
  }
}

const defaultRuntimeTransference = new RuntimeTransference();
shapeTerminalResponses((response, context) => defaultRuntimeTransference.adaptTerminalResponse(response, context));

export function getRuntimeTransference(): RuntimeTransference {
  return defaultRuntimeTransference;
}
