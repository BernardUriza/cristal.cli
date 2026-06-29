import { classifyStance } from "./StanceClassifier";
import { buildResponse, type RoomContext, type CristalReply } from "./CristalReplyBuilder";
import { StancePressureTracker, type PressureState } from "./StancePressureTracker";

const OPENERS = [
  "El sistema espera. No lo que sabes — lo que sientes.",
  "Escribe desde el cuerpo, no desde la cabeza. ¿Qué hay ahí?",
  "Aún no me das nada que replicar. ¿Qué sientes, ahora?",
];

const tracker = new StancePressureTracker();

function opener(seedLen: number): CristalReply {
  return {
    text: OPENERS[seedLen % OPENERS.length],
    tone: "press",
    asksForBody: true,
    forbiddenPhrasePresent: false,
  };
}

export function generateCristalPsychReply(
  input: string,
  roomContext?: RoomContext
): CristalReply {
  const trimmed = (input ?? "").trim();
  if (trimmed.length === 0) return opener(0);

  const stance = classifyStance(trimmed);
  if (stance.signals.length === 0) return opener(trimmed.length);

  tracker.record(stance.stance);
  const { pressure, repeatingStance } = tracker.state;
  return buildResponse(stance, trimmed, roomContext, { level: pressure, repeatingStance });
}

export function getPsychPressure(): PressureState {
  return tracker.state;
}

export function resetPsychSession(): void {
  tracker.reset();
}
