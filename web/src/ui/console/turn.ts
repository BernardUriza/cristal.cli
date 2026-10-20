import { useGame } from "../../game/store";
import { objectiveForSlice, type VerticalSliceState } from "../../game/VerticalSlice";
import { worldNodeById } from "../../game/worldNodes";
import { parse } from "../../terminal/inputParser";
import { getPsychPressure } from "../../terminal/psych/PsychologicalResponseEngine";
import type { getTerminalCore } from "../../terminal/terminalCore";
import type { TerminalResponse } from "../../terminal/types";
import { CONSOLE_COPY } from "./copy";
import { objectiveLine, plainLine, type Line } from "./lines";

type TerminalCore = ReturnType<typeof getTerminalCore>;

export interface ConsoleTurn {
  response: TerminalResponse | null;
  lines: Line[];
  objective: string | null;
  isCommand: boolean;
  localLine: string;
}

export function sliceTurnLines(input: string, before: VerticalSliceState, after: VerticalSliceState): { lines: Line[]; objective: string | null } {
  const lines = [plainLine(CONSOLE_COPY.echo(input), "echo")];
  if (!before.confessed && after.confessed && after.confessionFragment) {
    lines.push({ text: CONSOLE_COPY.archived(after.confessionFragment), cls: "mem", scramble: true });
  }
  const objective = before.step !== after.step ? objectiveForSlice(after) : null;
  if (objective) lines.push(objectiveLine(objective));
  return { lines, objective };
}

export function localVoiceLine(response: TerminalResponse): string {
  return response.lines.map((l) => l.trim()).filter(Boolean).join(" ");
}

export function runConsoleTurn(core: TerminalCore, input: string): ConsoleTurn {
  const game = useGame.getState();
  const response = core.processInput(input, {
    confessionFragment: game.verticalSlice.confessionFragment,
    invokedGlyph: game.verticalSlice.invokedGlyph,
    objective: objectiveForSlice(game.verticalSlice),
  });
  const pressure = getPsychPressure();
  const lastStance = pressure.recent[pressure.recent.length - 1] ?? null;
  useGame.getState().setPsychologicalPressure(pressure.pressure, lastStance);
  const isCommand = parse(input).isCommand;
  const consoleNode = worldNodeById(game.activeConsoleId);
  if (consoleNode && !isCommand) {
    useGame
      .getState()
      .addInscription(input, lastStance, { x: consoleNode.cell[0], y: consoleNode.cell[1] }, consoleNode.accent, Date.now());
    useGame.getState().reachFunnel("first_phrase", Date.now());
  }
  const sliceBefore = useGame.getState().verticalSlice;
  useGame.getState().recordConsoleInput(input);
  const { lines, objective } = sliceTurnLines(input, sliceBefore, useGame.getState().verticalSlice);
  return { response, lines, objective, isCommand, localLine: response ? localVoiceLine(response) : "" };
}

export function pressureHint(): string {
  const p = getPsychPressure();
  return CONSOLE_COPY.pressure(p.pressure, p.recent[p.recent.length - 1]);
}
