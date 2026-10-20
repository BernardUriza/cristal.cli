import { GameMode } from "../types";
import type { SymbolicArchetype } from "../../shared/archetype";
import { seedForExit, type Room } from "../roomApi";
import { resolveFalseDoorConsequences } from "../FalseDoorConsequences";
import { resolveSafeExit } from "../SafeExitResolver";
import { appendEmotionalHistory, type EmotionalHistoryEntry } from "../EmotionalHistory";
import { resolvePressureEnding } from "../PressureEnding";
import { recordEnvironmentalStance } from "../../terminal/psych/PsychologicalResponseEngine";
import { shouldFalseDoorBite, shouldOfferSafeExit, symbolicSeedBias } from "../RuntimeTransference";
import {
  beginNextVariation,
  confessionFragmentsForRoom,
  loadVerticalSlice,
  noteFalseDoor,
  noteGlyphInvoked,
  noteRoomCrossed,
  noteRoomDismissed,
  saveVerticalSlice,
  type VerticalSliceState,
} from "../VerticalSlice";
import { FALSE_DOOR_HISTORY_LIMIT, GOLDEN_RATIO_HASH, HISTORY_LIMIT } from "./config";
import {
  cachedRoom,
  fakeExitForRoom,
  forgetGlyphRoom,
  isRoomReadyOrPending,
  preparedGlyphRoom,
  rememberGlyphRoom,
  requestRoom,
  roomRequests,
} from "./roomCache";
import { resolveRoomEntryPressureEnding, runtimeTransference, stabilityRuntime } from "./pressureSlice";
import type { GameSlice, GameState, RoomFlowSlice } from "./types";

function pushHistory(history: Room[], room: Room): Room[] {
  const next = [...history.filter((r) => r.seed !== room.seed), room];
  return next.slice(-HISTORY_LIMIT);
}

function historyOnEntry(s: GameState, room: Room): EmotionalHistoryEntry[] {
  return s.psychologicalStance
    ? appendEmotionalHistory(s.emotionalHistory, {
        room: { seed: room.seed, name: room.name },
        stance: s.psychologicalStance,
        pressure: s.psychologicalPressure,
        timestamp: Date.now(),
      })
    : s.emotionalHistory;
}

function enterRoomPatch(
  s: GameState,
  room: Room,
  archetype: SymbolicArchetype,
  parentSeed: number | null,
  freshDescent: boolean
): Partial<GameState> {
  const emotionalHistory = historyOnEntry(s, room);
  return {
    room,
    roomArchetype: archetype,
    roomLoading: false,
    roomError: null,
    mode: GameMode.Room,
    parentSeed,
    roomHistory: pushHistory(s.roomHistory, room),
    emotionalHistory,
    pressureEnding: resolveRoomEntryPressureEnding(s),
    stability: stabilityRuntime.enter(room, freshDescent),
    transference: runtimeTransference.enterRoom({
      room,
      pressure: s.psychologicalPressure,
      history: emotionalHistory,
    }),
  };
}

function leaveRoomPatch(s: GameState): Partial<GameState> {
  return {
    room: null,
    roomLoading: false,
    roomError: null,
    roomArchetype: null,
    nearbyExit: null,
    parentSeed: null,
    roomHistory: [],
    stability: 100,
    roomPressureSpike: 0,
    lastRoomWhisper: null,
    pressureEnding: null,
    transference: runtimeTransference.completeSession({
      emotionalHistory: s.emotionalHistory,
      falseDoorCount: s.falseDoorAnnotations.length,
      roomDepths: s.roomHistory.map((_, i) => Math.max(0, s.depth - s.roomHistory.length + i + 1)),
    }),
    mode: s.mode === GameMode.Room ? GameMode.Exploration : s.mode,
  };
}

export const createRoomFlowSlice: GameSlice<RoomFlowSlice> = (set, get) => {
  const glyphRoomSeed = (archetype: SymbolicArchetype, glyphId: string): number => {
    const prepared = preparedGlyphRoom(glyphId);
    const confession = get().verticalSlice.confessionFragment ?? null;
    if (prepared && prepared.confession === confession) return prepared.seed;
    return seedForExit(
      (get().depth + 1) * GOLDEN_RATIO_HASH + symbolicSeedBias(archetype, get().transference.ritualGravity),
      glyphId.length + archetype.length
    );
  };

  const glyphRoomFragments = (archetype: SymbolicArchetype, slice: VerticalSliceState): string[] => [
    ...confessionFragmentsForRoom(slice),
    `ritual gravity ${get().transference.ritualGravity.archetypeBias[archetype].toFixed(2)}`,
  ];

  const loadRoom = (
    seed: number,
    archetype: SymbolicArchetype,
    fragments: string[],
    parentSeed: number | null,
    freshDescent: boolean
  ) => {
    const requestId = roomRequests.begin();
    const cached = cachedRoom(seed);
    if (cached) {
      set((s) => enterRoomPatch(s, cached, archetype, parentSeed, freshDescent));
      return;
    }
    set({ roomLoading: true, roomError: null, roomArchetype: archetype });
    requestRoom(seed, archetype, get().depth, fragments)
      .then((room) => {
        if (!roomRequests.isCurrent(requestId)) return;
        set((s) => ({ ...enterRoomPatch(s, room, archetype, parentSeed, freshDescent), depth: s.depth + 1 }));
      })
      .catch((e) => {
        if (!roomRequests.isCurrent(requestId)) return;
        set({ roomLoading: false, roomError: String(e) });
      });
  };

  return {
    room: null,
    roomArchetype: null,
    roomLoading: false,
    roomError: null,
    depth: 0,
    parentSeed: null,
    roomHistory: [],
    falseDoorAnnotations: [],
    lastRoomWhisper: null,
    dangerousSeeds: [],
    verticalSlice: loadVerticalSlice(),

    invokeGlyph: (archetype, glyphId) => {
      if (get().roomLoading) return;
      const seed = glyphRoomSeed(archetype, glyphId);
      forgetGlyphRoom(glyphId);
      const verticalSlice = noteGlyphInvoked(get().verticalSlice, glyphId, archetype);
      saveVerticalSlice(verticalSlice);
      get().reachFunnel("glyph_invoked", Date.now());
      set({ roomHistory: [], verticalSlice });
      loadRoom(seed, archetype, glyphRoomFragments(archetype, verticalSlice), null, true);
    },

    prefetchGlyphRoom: (archetype, glyphId) => {
      const seed = glyphRoomSeed(archetype, glyphId);
      rememberGlyphRoom(glyphId, { seed, confession: get().verticalSlice.confessionFragment ?? null });
      if (isRoomReadyOrPending(seed)) return;
      void requestRoom(seed, archetype, get().depth, glyphRoomFragments(archetype, get().verticalSlice)).catch(
        () => undefined
      );
    },

    takeExit: (index) => {
      const { room, roomArchetype, roomLoading } = get();
      if (!room || roomLoading || !roomArchetype) return;
      if (index < 0) return;
      const safeExit = resolveSafeExit({
        stance: get().psychologicalStance,
        pressure: get().psychologicalPressure,
        room,
      });
      if (index >= room.exits.length && index !== safeExit?.index) return;
      if (shouldFalseDoorBite(room, index, fakeExitForRoom(room), get().transference.worldBehavior)) {
        const consequence = resolveFalseDoorConsequences({
          roomSeed: room.seed,
          exitIndex: index,
          pressureBefore: get().psychologicalPressure,
          priorFalseDoors: get().falseDoorAnnotations.length,
        });
        const pressure = recordEnvironmentalStance(consequence.pressureStance);
        const engine = stabilityRuntime.current();
        engine?.falseDoorPenalty();
        set((s) => {
          const verticalSlice = noteFalseDoor(s.verticalSlice);
          saveVerticalSlice(verticalSlice);
          const emotionalHistory = appendEmotionalHistory(s.emotionalHistory, {
            room: { seed: room.seed, name: room.name },
            stance: consequence.pressureStance,
            pressure: pressure.pressure,
            timestamp: Date.now(),
          });
          return {
            stability: engine ? engine.state.stability : s.stability,
            psychologicalPressure: pressure.pressure,
            psychologicalStance: consequence.pressureStance,
            pressureEnding:
              s.pressureEnding ??
              resolvePressureEnding({
                pressure: pressure.pressure,
                inRoom: s.mode === GameMode.Room && !!s.room,
                now: Date.now(),
              }),
            roomPressureSpike: Math.max(s.roomPressureSpike, consequence.atmosphereSpike),
            falseDoorAnnotations: [
              ...s.falseDoorAnnotations,
              { ...consequence.annotation, timestamp: Date.now() },
            ].slice(-FALSE_DOOR_HISTORY_LIMIT),
            emotionalHistory,
            lastRoomWhisper: consequence.whisper,
            verticalSlice,
            dangerousSeeds: s.dangerousSeeds.includes(room.seed)
              ? s.dangerousSeeds
              : [...s.dangerousSeeds, room.seed],
            transference: runtimeTransference.recordInteraction({
              stance: consequence.pressureStance,
              pressure: pressure.pressure,
              room,
              history: emotionalHistory,
              revisitedRoom: true,
            }),
          };
        });
        if (engine?.isEvicted) get().collapseRoom();
        return;
      }
      if (shouldOfferSafeExit(room, safeExit, get().transference.worldBehavior) && index === safeExit.index) {
        stabilityRuntime.current()?.safeDoorReward();
        get().reachFunnel("door_crossed", Date.now());
        const verticalSlice = noteRoomCrossed(get().verticalSlice, safeExit.label);
        saveVerticalSlice(verticalSlice);
        set({ lastRoomWhisper: "La puerta no se abre: deja de defenderse.", verticalSlice });
        loadRoom(safeExit.seed, roomArchetype, [room.inscription, "confession opened a stable path"], room.seed, false);
        return;
      }
      stabilityRuntime.current()?.safeDoorReward();
      const exitLabel = room.exits[index] ?? `puerta ${index + 1}`;
      get().reachFunnel("door_crossed", Date.now());
      const verticalSlice = noteRoomCrossed(get().verticalSlice, exitLabel);
      saveVerticalSlice(verticalSlice);
      set({ lastRoomWhisper: null, verticalSlice });
      loadRoom(seedForExit(room.seed, index), roomArchetype, [room.inscription], room.seed, false);
    },

    collapseRoom: () => {
      stabilityRuntime.reset();
      roomRequests.invalidate();
      set((s) => ({
        ...leaveRoomPatch(s),
        dangerousSeeds:
          s.room && !s.dangerousSeeds.includes(s.room.seed)
            ? [...s.dangerousSeeds, s.room.seed]
            : s.dangerousSeeds,
      }));
    },

    dismissRoom: () => {
      stabilityRuntime.reset();
      roomRequests.invalidate();
      set((s) => {
        const verticalSlice = noteRoomDismissed(s.verticalSlice);
        saveVerticalSlice(verticalSlice);
        return { ...leaveRoomPatch(s), verticalSlice };
      });
    },

    startNextVariation: () =>
      set((s) => {
        const verticalSlice = beginNextVariation(s.verticalSlice);
        if (verticalSlice === s.verticalSlice) return s;
        saveVerticalSlice(verticalSlice);
        return { verticalSlice };
      }),
  };
};
