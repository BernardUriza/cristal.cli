import { classifyStance } from "./StanceClassifier";
import { buildResponse, type RoomContext, type CristalReply } from "./CristalReplyBuilder";

const OPENERS = [
  "El sistema espera. No lo que sabes — lo que sientes.",
  "Escribe desde el cuerpo, no desde la cabeza. ¿Qué hay ahí?",
  "Aún no me das nada que replicar. ¿Qué sientes, ahora?",
];

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

  return buildResponse(stance, trimmed, roomContext);
}
