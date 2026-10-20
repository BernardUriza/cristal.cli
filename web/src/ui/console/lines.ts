import { ResponseType, type TerminalResponse } from "../../terminal/types";
import { CONSOLE_COPY } from "./copy";

export interface Line {
  text: string;
  cls: string;
  scramble: boolean;
}

const TYPE_CLASS: Record<ResponseType, string> = {
  [ResponseType.System]: "system",
  [ResponseType.Memory]: "mem",
  [ResponseType.Identity]: "identity",
  [ResponseType.Emotional]: "emo",
  [ResponseType.Error]: "err",
  [ResponseType.Default]: "out",
  [ResponseType.AI]: "out",
};

export function toLines(res: TerminalResponse): Line[] {
  const cls = TYPE_CLASS[res.responseType] ?? "out";
  return res.lines.map((text) => ({ text, cls, scramble: res.applyGlitch }));
}

export const plainLine = (text: string, cls: string): Line => ({ text, cls, scramble: false });

export const objectiveLine = (objective: string): Line => plainLine(CONSOLE_COPY.objective(objective), "system");

export function placeLine(lines: readonly Line[], index: number, line: Line): { lines: Line[]; index: number } {
  if (index === -1) return { lines: [...lines, line], index: lines.length };
  const next = [...lines];
  next[index] = line;
  return { lines: next, index };
}
