import { afterEach, beforeEach, describe, expect, it } from "vitest";
import { GameMode } from "../game/types";
import { useGame } from "../game/store";
import type { Room } from "../game/roomApi";
import { getPsychPressure, resetPsychSession } from "./psych/PsychologicalResponseEngine";
import { TerminalCore } from "./terminalCore";
import { CATCH_ALL_POOL } from "./psych/replyPool";

const CATCH_ALL = CATCH_ALL_POOL.map((line) => line.text.replace("{palabra}", "ruido \\d"));

const room: Room = {
  name: "Pressure Room",
  inscription: "",
  description: "",
  exits: ["north"],
  dread: 0,
  shape: "chamber",
  seed: 33,
};

function mirrorConsolePressure(): void {
  const pressure = getPsychPressure();
  useGame
    .getState()
    .setPsychologicalPressure(
      pressure.pressure,
      pressure.recent[pressure.recent.length - 1] ?? null
    );
}

describe("TerminalCore psychological pressure integration", () => {
  let core: TerminalCore;

  beforeEach(() => {
    resetPsychSession();
    useGame.setState({ ...useGame.getInitialState(), mode: GameMode.Room, room }, true);
    core = new TerminalCore();
  });

  afterEach(() => {
    resetPsychSession();
    useGame.setState(useGame.getInitialState(), true);
  });

  it("records evasive Spanish through the real console path and mirrors it into the store", () => {
    core.processInput("tengo miedo y me siento solo, me duele el pecho");
    mirrorConsolePressure();
    const confessed = getPsychPressure();

    expect(confessed.pressure).toBe(0);
    expect(confessed.recent[confessed.recent.length - 1]).toBe("confession");
    expect(useGame.getState().psychologicalStance).toBe("confession");

    core.processInput("siguiente. no. paso. cambia de tema ya.");
    mirrorConsolePressure();
    const firstDeflection = getPsychPressure();

    expect(firstDeflection.recent[firstDeflection.recent.length - 1]).toBe("deflection");
    expect(firstDeflection.pressure).toBeGreaterThan(confessed.pressure);
    expect(useGame.getState().psychologicalStance).toBe("deflection");
    const history = useGame.getState().emotionalHistory;
    expect(history[history.length - 1]?.stance).toBe("deflection");

    core.processInput("jaja que pregunta rara, cambiemos de tema");
    mirrorConsolePressure();
    const secondDeflection = getPsychPressure();

    expect(secondDeflection.recent[secondDeflection.recent.length - 1]).toBe("deflection");
    expect(secondDeflection.pressure).toBeGreaterThan(firstDeflection.pressure);

    core.processInput("tengo miedo y me siento solo, me duele el pecho");
    mirrorConsolePressure();
    const relieved = getPsychPressure();

    expect(relieved.recent[relieved.recent.length - 1]).toBe("confession");
    expect(relieved.pressure).toBeLessThan(secondDeflection.pressure);
    expect(useGame.getState().psychologicalStance).toBe("confession");
  });

  it("replays me.tikkum's console (2026-10-16) and never goes mute on bodily answers", () => {
    const transcript = [
      "me siento cansado y confundido",
      "VISION",
      "LUNA",
      "es fría",
      "tiene frío",
      "sufre por el frío",
      "incomodidad",
    ];
    const bodily: string[] = [];
    for (const line of transcript) {
      const response = core.processInput(line);
      const spoken = (response?.lines ?? []).filter((l) => l.trim().length > 0);
      expect(spoken, line).not.toEqual(["..."]);
      expect(spoken.join(" "), line).not.toMatch(/Escribe desde el cuerpo|nada que replicar|no (te )?entiend/);
      if (transcript.indexOf(line) >= 3) bodily.push(spoken[0]);
    }
    expect(new Set(bodily).size, bodily.join(" | ")).toBe(4);
  });

  it("never emits the ellipsis alone and pivots toward the rite before the tenth evasive turn", () => {
    const context = { objective: "Invoca un glifo: LUNA, VISION o ROTURA.", invokedGlyph: "luna" };
    const spokenTurns: string[][] = [];
    for (let i = 0; i < 12; i++) {
      const response = core.processInput("no siento nada, da igual", context);
      const spoken = (response?.lines ?? []).filter((l) => l.trim().length > 0);
      expect(spoken, `turn ${i}`).not.toEqual(["..."]);
      expect(spoken.length, `turn ${i}`).toBeGreaterThan(0);
      spokenTurns.push(spoken);
    }
    for (let i = 1; i < spokenTurns.length; i++) {
      expect(spokenTurns[i][0], `turn ${i}`).not.toBe(spokenTurns[i - 1][0]);
    }
    const pivotTurn = spokenTurns.findIndex((lines) => lines.some((l) => /Invoca un glifo|LUNA|otro cuarto|Camina|lugar donde no estés|laberinto también habla/.test(l)));
    expect(pivotTurn).toBeGreaterThanOrEqual(0);
    expect(pivotTurn).toBeLessThan(10);
  });

  it("reflects garbage once, pivots on the second, and never repeats the pivot", () => {
    const context = { objective: "Conecta una consola." };
    const first = core.processInput("zxqv", context)?.lines.filter((l) => l.trim().length > 0) ?? [];
    expect(first.join(" ")).toContain("«zxqv»");
    const pivots: string[] = [];
    for (let i = 0; i < 6; i++) {
      const pivot = core.processInput(`basura ${i}`, context)?.lines.filter((l) => l.trim().length > 0) ?? [];
      expect(pivot.join(" "), `pivot ${i}`).not.toContain("«");
      pivots.push(pivot[0]);
      const reflect = core.processInput(`ruido ${i}`, context)?.lines.filter((l) => l.trim().length > 0) ?? [];
      expect(CATCH_ALL.some((text) => new RegExp(text).test(reflect[0])), `reflect ${i}: ${reflect[0]}`).toBe(true);
    }
    for (let i = 1; i < pivots.length; i++) expect(pivots[i], `pivot ${i}`).not.toBe(pivots[i - 1]);
  });

  it("does not let unclassified input inherit the previous stance's silence stagnation", () => {
    core.processInput("soy un arcano roto bajo la luna");
    for (let i = 0; i < 5; i++) {
      const response = core.processInput(`zxqv ${i}`);
      const spoken = (response?.lines ?? []).filter((l) => l.trim().length > 0);
      expect(spoken, `turn ${i}`).not.toEqual(["..."]);
    }
  });
});
