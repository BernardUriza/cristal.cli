import type { SymbolicArchetype } from "../../shared/archetype";
import { seedForExit, type Room } from "../roomApi";
import { resolveFalseDoorConsequences } from "../FalseDoorConsequences";
import { resolveSafeExit } from "../SafeExitResolver";
import { recordEnvironmentalStance } from "../../terminal/psych/PsychologicalResponseEngine";
import { shouldFalseDoorBite, shouldOfferSafeExit, symbolicSeedBias } from "../transference/worldDice";
import {
  beginNextVariation,
  confessionFragmentsForRoom,
  noteFalseDoor,
  noteGlyphInvoked,
  noteRoomCrossed,
  noteRoomDismissed,
  type VerticalSliceState,
} from "../VerticalSlice";
import { loadVerticalSlice } from "../VerticalSliceStorage";
import { GOLDEN_RATIO_HASH } from "./config";
import {
  falseDoorHistory,
  falseDoorPatch,
  historyOnEntry,
  roomEntryPatch,
  roomLeavePatch,
  sessionRoomDepths,
  withDangerousSeed,
} from "./roomFlowPatches";
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

function enterRoom(
  s: GameState,
  room: Room,
  archetype: SymbolicArchetype,
  parentSeed: number | null,
  freshDescent: boolean
): Partial<GameState> {
  const emotionalHistory = historyOnEntry(s, room, Date.now());
  return roomEntryPatch(s, room, archetype, parentSeed, emotionalHistory, {
    pressureEnding: resolveRoomEntryPressureEnding(s),
    stability: stabilityRuntime.enter(room, freshDescent),
    transference: runtimeTransference.enterRoom({ room, pressure: s.psychologicalPressure, history: emotionalHistory }),
  });
}

function leaveRoom(s: GameState): Partial<GameState> {
  return roomLeavePatch(
    s,
    runtimeTransference.completeSession({
      emotionalHistory: s.emotionalHistory,
      falseDoorCount: s.falseDoorAnnotations.length,
      roomDepths: sessionRoomDepths(s),
    })
  );
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
      set((s) => enterRoom(s, cached, archetype, parentSeed, freshDescent));
      return;
    }
    set({ roomLoading: true, roomError: null, roomArchetype: archetype });
    requestRoom(seed, archetype, get().depth, fragments)
      .then((room) => {
        if (!roomRequests.isCurrent(requestId)) return;
        set((s) => ({ ...enterRoom(s, room, archetype, parentSeed, freshDescent), depth: s.depth + 1 }));
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
          const now = Date.now();
          const emotionalHistory = falseDoorHistory(s, room, consequence, pressure.pressure, now);
          return falseDoorPatch(s, {
            room,
            consequence,
            pressure: pressure.pressure,
            stability: engine ? engine.state.stability : null,
            emotionalHistory,
            verticalSlice: noteFalseDoor(s.verticalSlice),
            transference: runtimeTransference.recordInteraction({
              stance: consequence.pressureStance,
              pressure: pressure.pressure,
              room,
              history: emotionalHistory,
              revisitedRoom: true,
            }),
            now,
          });
        });
        if (engine?.isEvicted) get().collapseRoom();
        return;
      }
      if (shouldOfferSafeExit(room, safeExit, get().transference.worldBehavior) && index === safeExit.index) {
        stabilityRuntime.current()?.safeDoorReward();
        get().reachFunnel("door_crossed", Date.now());
        const verticalSlice = noteRoomCrossed(get().verticalSlice, safeExit.label);
        set({ lastRoomWhisper: "La puerta no se abre: deja de defenderse.", verticalSlice });
        loadRoom(safeExit.seed, roomArchetype, [room.inscription, "confession opened a stable path"], room.seed, false);
        return;
      }
      stabilityRuntime.current()?.safeDoorReward();
      const exitLabel = room.exits[index] ?? `puerta ${index + 1}`;
      get().reachFunnel("door_crossed", Date.now());
      const verticalSlice = noteRoomCrossed(get().verticalSlice, exitLabel);
      set({ lastRoomWhisper: null, verticalSlice });
      loadRoom(seedForExit(room.seed, index), roomArchetype, [room.inscription], room.seed, false);
    },

    collapseRoom: () => {
      stabilityRuntime.reset();
      roomRequests.invalidate();
      set((s) => ({ ...leaveRoom(s), dangerousSeeds: withDangerousSeed(s.dangerousSeeds, s.room?.seed) }));
    },

    dismissRoom: () => {
      stabilityRuntime.reset();
      roomRequests.invalidate();
      set((s) => ({ ...leaveRoom(s), verticalSlice: noteRoomDismissed(s.verticalSlice) }));
    },

    startNextVariation: () =>
      set((s) => {
        const verticalSlice = beginNextVariation(s.verticalSlice);
        return verticalSlice === s.verticalSlice ? s : { verticalSlice };
      }),
  };
};
