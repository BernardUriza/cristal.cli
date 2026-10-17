import type { Stance, StanceProfile } from "./StanceClassifier";
import { REPLY_POOL } from "./replyPool";
import { createBagState, drawReply, DEFAULT_REPLY_CONTEXT, type BagState, type ReplyContext } from "./ReplyBag";

export interface CristalReply {
  text: string;
  stance: Stance | null;
  tone: "mirror" | "interrupt" | "soften" | "press" | "ritual";
  asksForBody: boolean;
  forbiddenPhrasePresent: boolean;
}

export const FORBIDDEN = /no\s+(te\s+)?entend|i\s+don'?t\s+understand|context:\s*undefined|se\s+mas\s+especific|sé\s+más\s+específic/i;

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

export function buildResponse(
  profile: StanceProfile,
  input: string,
  context: Partial<ReplyContext> = {},
  bag: BagState = createBagState()
): { reply: CristalReply; bag: BagState } {
  const ctx: ReplyContext = { ...DEFAULT_REPLY_CONTEXT, word: profile.salientWord || input, ...context };
  const drawn = drawReply(profile.stance, REPLY_POOL[profile.stance], ctx, bag);
  const tone = ctx.repeating ? "press" : TONE[profile.stance];
  return {
    reply: {
      text: drawn.text,
      stance: profile.stance,
      tone,
      asksForBody: ASKS_BODY[profile.stance],
      forbiddenPhrasePresent: FORBIDDEN.test(drawn.text),
    },
    bag: drawn.state,
  };
}
