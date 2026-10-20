import type { ResponseContext } from "../../terminal/responseShaper";
import type { RuntimeTransferenceSnapshot } from "./snapshot";
import { terminalEchoRoll, terminalSilenceRoll } from "./worldDice";

export const TERMINAL_ADAPTER_COPY = {
  identityGreeting: (identity: string) => `${identity}.`,
  resistancePrefix: "I recognize the turn away.",
  statesPattern: "The room does not ask this time. It names the pattern.",
  asksFirst: "What should the room learn first?",
  silence: "...",
} as const;

const SILENCE_DELAY_MS = 900;
const ECHO_COOLDOWN_TURNS = 4;

export interface TerminalTurnClock {
  turn: number;
  lastEchoTurn: number;
}

const nonEmpty = (lines: string[]) => lines.filter((line) => line.trim().length > 0);

export function adaptTerminalResponse<T extends { lines: string[]; delayMs?: number }>(
  response: T,
  context: ResponseContext,
  snapshot: RuntimeTransferenceSnapshot,
  clock: TerminalTurnClock
): { response: T; echoed: boolean } {
  const { profile, relationship, identity, worldBehavior, memoryEchoes, worldConfidence } = snapshot;
  let lines = [...response.lines];

  if (context === "welcome" && identity.identity !== "You") {
    lines = [TERMINAL_ADAPTER_COPY.identityGreeting(identity.identity), ...lines];
  }

  if (context === "input" && relationship.resistance > relationship.trust + 0.2) {
    const first = lines.findIndex((line) => line.trim().length > 0);
    if (first >= 0) lines[first] = `${TERMINAL_ADAPTER_COPY.resistancePrefix} ${lines[first]}`;
  }

  if (worldConfidence.terminalMode === "states" && context === "input") {
    lines.push(TERMINAL_ADAPTER_COPY.statesPattern);
  } else if (worldConfidence.terminalMode === "asks" && context === "welcome") {
    lines.push(TERMINAL_ADAPTER_COPY.asksFirst);
  }

  const verbosity = worldBehavior?.roomVerbosity ?? (0.42 + profile.confessionRate * 0.18);
  if (verbosity < 0.34 && lines.length > 2) lines = nonEmpty(lines).slice(0, 2);

  const silenceProbability = worldBehavior?.silenceProbability ?? profile.silenceTolerance * 0.55;
  const shouldWait = context === "input" && silenceProbability > 0.45 && terminalSilenceRoll(clock.turn) < silenceProbability;
  if (shouldWait && relationship.trust < 0.42) lines = [TERMINAL_ADAPTER_COPY.silence, ...nonEmpty(lines).slice(0, 1)];

  const echo = memoryEchoes[0];
  const echoed = Boolean(
    context === "input" &&
      echo &&
      clock.turn - clock.lastEchoTurn >= ECHO_COOLDOWN_TURNS &&
      terminalEchoRoll(clock.turn, echo.intensity) < echo.intensity
  );
  if (echoed) lines.push(echo.text);

  return {
    response: { ...response, lines, delayMs: Math.max(response.delayMs ?? 0, shouldWait ? SILENCE_DELAY_MS : 0) || undefined },
    echoed,
  };
}
