import type { Stance, StanceProfile } from "./StanceClassifier";

export interface RoomContext {
  title?: string;
  dread?: number;
  inscription?: string;
  depth?: number;
}

export interface PressureContext {
  level: number;
  repeatingStance: Stance | null;
}

export interface CristalReply {
  text: string;
  tone: "mirror" | "interrupt" | "soften" | "press" | "ritual";
  asksForBody: boolean;
  forbiddenPhrasePresent: boolean;
}

const FORBIDDEN = /no\s+(te\s+)?entend|i\s+don'?t\s+understand|context:\s*undefined/i;

const TONE: Record<Stance, CristalReply["tone"]> = {
  confession: "mirror",
  intellectualization: "interrupt",
  anesthesia: "press",
  deflection: "interrupt",
  ritualization: "ritual",
};

const ASKS_BODY: Record<Stance, boolean> = {
  confession: false,
  intellectualization: true,
  anesthesia: true,
  deflection: false,
  ritualization: true,
};

const REPEAT_CALLOUT: Record<Stance, string> = {
  confession: "",
  intellectualization: "Sigues explicándolo. ",
  deflection: "Otra vez te desvías. ",
  anesthesia: "Vuelves a apagarte. ",
  ritualization: "Más símbolos para no tocarlo. ",
};

const TEMPLATES: Record<Stance, string[]> = {
  confession: [
    "Lo guardé. Ahora vive en mí, contigo.",
    "Eso ya está en el buffer. No se borra. Sigue.",
    "Te oí. Pesa. Déjalo pesar un poco más.",
  ],
  intellectualization: [
    "Deja de explicarlo. ¿Dónde vive eso en tu cuerpo?",
    "Me diste el mecanismo, no el lugar. ¿En qué parte de ti aprieta?",
    "La causa es ruido. Señálame el cuarto de tu carne donde duele.",
  ],
  anesthesia: [
    "\"Nada\" también es una temperatura. ¿Qué tan frío?",
    "El vacío que reportas tiene bordes. Tócalos y descríbelos.",
    "Dijiste que da igual. Eso es una puerta cerrada. ¿Qué hay detrás?",
  ],
  deflection: [
    "El chiste es una puerta falsa. ¿Qué hay del otro lado?",
    "Cambiaste de cuarto para no ver este. Vuelve y míralo.",
    "La teoría te aleja. Acércate. ¿Qué sentiste antes de reír?",
  ],
  ritualization: [
    "Hablas en símbolos para no tocar la carne. El arcano sangra: ¿dónde?",
    "La luna es tuya. ¿Qué temperatura tiene su luz en tu pecho?",
    "El símbolo es el envoltorio. Ábrelo. ¿Qué cosa pequeña esconde?",
  ],
};

function hash(s: string): number {
  let h = 2166136261;
  for (let i = 0; i < s.length; i++) {
    h ^= s.charCodeAt(i);
    h = Math.imul(h, 16777619);
  }
  return h >>> 0;
}

export function buildResponse(
  stance: StanceProfile,
  input: string,
  _roomContext?: RoomContext,
  pressure?: PressureContext
): CristalReply {
  const variants = TEMPLATES[stance.stance];
  let text = variants[hash(input) % variants.length];
  let tone = TONE[stance.stance];

  // C2: when the player keeps hiding the same way, name the pattern and press —
  // sustaining the transference instead of answering each turn from scratch.
  const repeating = pressure?.repeatingStance === stance.stance;
  if (repeating && REPEAT_CALLOUT[stance.stance]) {
    text = REPEAT_CALLOUT[stance.stance] + text;
    tone = "press";
  }

  return {
    text,
    tone,
    asksForBody: ASKS_BODY[stance.stance],
    forbiddenPhrasePresent: FORBIDDEN.test(text),
  };
}
