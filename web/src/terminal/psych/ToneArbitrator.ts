import type { CristalReply } from "./CristalReplyBuilder";

export type PsychTone = CristalReply["tone"];

export interface StateEffect {
  forceUppercase: boolean;
  glitchMultiplier: number;
  prefix: string;
  suffix: string;
}

const TENDER: PsychTone[] = ["mirror", "soften"];
const TENDER_GLITCH_CAP = 1.2;

// The visual state effect (Echo, Corrupted, UNBOUND) must never override the
// psychological tone of the reply. On a tender disclosure the system may still
// distort the surface, but it can never shout (uppercase) or shatter the words —
// that would humiliate the confession and break the transference. Pressing and
// ritual tones keep the full effect.
export function arbitrate<T extends StateEffect>(tone: PsychTone | undefined, effect: T): T {
  if (tone === undefined || !TENDER.includes(tone)) return effect;
  return {
    ...effect,
    forceUppercase: false,
    glitchMultiplier: Math.min(effect.glitchMultiplier, TENDER_GLITCH_CAP),
  };
}
