import { afterEach, beforeEach, describe, expect, it } from "vitest";
import { GameMode } from "../game/types";
import { useGame } from "../game/store";
import type { Room } from "../game/roomApi";
import { getPsychPressure, resetPsychSession } from "./psych/PsychologicalResponseEngine";
import { TerminalCore } from "./terminalCore";

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
});
