import { afterEach, describe, expect, it } from "vitest";
import type { Stance } from "../terminal/psych/StanceClassifier";
import { getPsychPressure, resetPsychSession } from "../terminal/psych/PsychologicalResponseEngine";
import { TerminalCore } from "../terminal/terminalCore";
import type { EmotionalHistoryEntry } from "./EmotionalHistory";
import type { TransferenceStorage } from "./PersistentTransference";
import { RuntimeTransference, getRuntimeTransference } from "./RuntimeTransference";
import type { Room } from "./roomApi";
import { useGame } from "./store";
import { GameMode } from "./types";

const room: Room = {
  name: "Remembering Corridor",
  inscription: "The same answer returns through a different door.",
  description: "",
  exits: ["north", "east", "down"],
  dread: 62,
  shape: "corridor",
  seed: 812,
};

function memoryStorage(): TransferenceStorage {
  const values = new Map<string, string>();
  return {
    getItem: (key) => values.get(key) ?? null,
    setItem: (key, value) => values.set(key, value),
    removeItem: (key) => values.delete(key),
  };
}

function history(stance: Stance, count: number, pressure: number, targetRoom = room): EmotionalHistoryEntry[] {
  return Array.from({ length: count }, (_, i) => ({
    room: { seed: targetRoom.seed + (i % 2), name: i % 2 === 0 ? targetRoom.name : "Threshold Annex" },
    stance,
    pressure,
    timestamp: 1000 + i,
  }));
}

function mixedHistory(): EmotionalHistoryEntry[] {
  return [
    ...history("ritualization", 8, 0.62),
    ...history("deflection", 6, 0.78),
    ...history("anesthesia", 4, 0.7),
  ];
}

function mirrorConsolePressure(): void {
  const pressure = getPsychPressure();
  useGame
    .getState()
    .setPsychologicalPressure(pressure.pressure, pressure.recent[pressure.recent.length - 1] ?? null);
}

function resetRuntimeAndStore(): void {
  resetPsychSession();
  const transference = getRuntimeTransference().reset();
  useGame.setState({ ...useGame.getInitialState(), transference }, true);
}

describe("RuntimeTransference D3 integration", () => {
  afterEach(() => {
    resetRuntimeAndStore();
  });

  it("loads a persistent profile after a restart and preserves identity pressure", () => {
    const storage = memoryStorage();
    const firstRuntime = new RuntimeTransference(storage);

    const first = firstRuntime.completeSession({
      emotionalHistory: mixedHistory(),
      falseDoorCount: 3,
      roomDepths: [1, 2, 3, 4],
      ritualMoments: 8,
      silenceMoments: 4,
    });

    const restarted = new RuntimeTransference(storage).bootstrap();

    expect(restarted.profile.dominantDefense).toBe(first.profile.dominantDefense);
    expect(restarted.profile.confidence).toBeGreaterThan(0);
    expect(restarted.saveMetadata.identity).toBe(restarted.identity.identity);
  });

  it("makes different persistent profiles produce different runtime world behavior", () => {
    const storage = memoryStorage();
    const earlyRuntime = new RuntimeTransference(storage);
    const early = earlyRuntime.enterRoom({ room, pressure: 0.1, history: [] });

    const shapedRuntime = new RuntimeTransference(storage);
    shapedRuntime.completeSession({
      emotionalHistory: history("deflection", 16, 0.84),
      falseDoorCount: 5,
      roomDepths: [1, 1, 2],
    });
    shapedRuntime.completeSession({
      emotionalHistory: history("ritualization", 16, 0.72),
      falseDoorCount: 4,
      roomDepths: [2, 3, 3],
      ritualMoments: 12,
    });
    const shaped = shapedRuntime.enterRoom({ room, pressure: { pressure: 0.72, consecutiveEvasion: 4 }, history: mixedHistory() });

    expect(shaped.worldBehavior?.falseDoorProbability).toBeGreaterThan(early.worldBehavior?.falseDoorProbability ?? 0);
    expect(shaped.worldBehavior?.architectureDrift).toBeGreaterThan(early.worldBehavior?.architectureDrift ?? 0);
    expect(shaped.emotionalSeason.effects.refusal).toBeGreaterThan(early.emotionalSeason.effects.refusal);
  });

  it("drives relationship and memory echoes through the real terminal and store path", () => {
    resetRuntimeAndStore();
    useGame.setState({ mode: GameMode.Room, room, roomArchetype: "echo" });
    const core = new TerminalCore();

    core.processInput("tengo miedo y me duele estar aqui");
    mirrorConsolePressure();
    core.processInput("siguiente. no. cambia de tema.");
    mirrorConsolePressure();

    const state = useGame.getState();
    expect(state.transference.relationship.interactionCount).toBe(2);
    expect(state.transference.relationship.lastStance).toBe("deflection");
    expect(state.transference.memoryEchoes.map((echo) => echo.source)).toContain("changed-answer");
  });

  it("uses D2 state for ritual gravity, absence, identity drift, narrative reflection, and confident terminal phrasing", () => {
    resetRuntimeAndStore();
    const runtime = getRuntimeTransference();
    for (let i = 0; i < 4; i += 1) {
      runtime.completeSession({
        emotionalHistory: mixedHistory(),
        falseDoorCount: 4,
        roomDepths: [2, 3, 4, 5],
        ritualMoments: 8,
        silenceMoments: 4,
      });
    }
    const seeded = runtime.enterRoom({ room, pressure: 0.68, history: mixedHistory() });
    useGame.setState({
      ...useGame.getInitialState(),
      mode: GameMode.Room,
      room,
      roomArchetype: "moon",
      emotionalHistory: mixedHistory(),
      transference: seeded,
    }, true);

    const beforeMoon = useGame.getState().transference.ritualGravity.archetypeBias.moon;
    useGame.getState().setLastSymbol({ archetype: "moon", signal: "invoked", intensity: 1, at: 2000 });
    const afterMoon = useGame.getState().transference.ritualGravity.archetypeBias.moon;

    expect(afterMoon).toBeGreaterThan(beforeMoon);
    expect(useGame.getState().transference.absencePlan.omissions.length).toBeGreaterThan(0);
    expect(useGame.getState().transference.identity.updates).toBeGreaterThan(0);
    expect(useGame.getState().transference.worldConfidence.terminalMode).toBe("states");

    const response = new TerminalCore().processInput("que sabes de mi");
    expect(response?.lines.join(" ")).toContain("names the pattern");

    useGame.getState().dismissRoom();
    expect(useGame.getState().transference.narrativeReflection).toMatch(/labyrinth|rooms/i);
  });
});
