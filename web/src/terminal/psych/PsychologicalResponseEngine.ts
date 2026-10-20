import { classifyStance, type Stance } from "./StanceClassifier";
import { buildResponse, FORBIDDEN, type CristalReply } from "./CristalReplyBuilder";
import { StancePressureTracker, type PressureState } from "./StancePressureTracker";
import { createBagState, drawReply, DEFAULT_REPLY_CONTEXT, type BagState, type ReplyContext } from "./ReplyBag";
import { CATCH_ALL_POOL, PIVOT_POOL, SILENCE_NAG_POOL } from "./replyPool";

export interface PsychContext {
  sessionId?: string;
  confessionFragment?: string | null;
  invokedGlyph?: string | null;
  objective?: string | null;
}

export type SilenceCompanionKind = "nag" | "pivot";

interface PsychSession {
  tracker: StancePressureTracker;
  bag: BagState;
  turn: number;
  lastReply: CristalReply | null;
  catchAllStreak: number;
}

function freshSession(): PsychSession {
  return { tracker: new StancePressureTracker(), bag: createBagState(), turn: 0, lastReply: null, catchAllStreak: 0 };
}

let session = freshSession();

function replyContext(input: string, word: string, context: PsychContext, stance: Stance | null): ReplyContext {
  const { pressure, repeatingStance } = session.tracker.state;
  return {
    ...DEFAULT_REPLY_CONTEXT,
    sessionId: context.sessionId ?? DEFAULT_REPLY_CONTEXT.sessionId,
    turn: session.turn,
    pressure,
    repeating: stance !== null && repeatingStance === stance,
    afterBodyQuestion: afterBodyQuestion(),
    word: word || input,
    confessionFragment: context.confessionFragment ?? null,
    invokedGlyph: context.invokedGlyph ?? null,
    objective: context.objective ?? null,
  };
}

function afterBodyQuestion(): boolean {
  const last = session.lastReply;
  return last !== null && last.stance !== null && last.asksForBody;
}

function remember(reply: CristalReply): CristalReply {
  session.lastReply = reply;
  return reply;
}

function catchAll(input: string, word: string, context: PsychContext): CristalReply {
  session.catchAllStreak += 1;
  const pivot = session.catchAllStreak >= 2;
  if (pivot) session.catchAllStreak = 0;
  const ctx = replyContext(input, word, context, null);
  const drawn = pivot
    ? drawReply("pivot", PIVOT_POOL, ctx, session.bag)
    : drawReply("catch-all", CATCH_ALL_POOL, ctx, session.bag);
  session.bag = drawn.state;
  return remember({
    text: drawn.text,
    stance: null,
    tone: pivot ? "interrupt" : "soften",
    asksForBody: !pivot,
    forbiddenPhrasePresent: FORBIDDEN.test(drawn.text),
  });
}

export function generateCristalPsychReply(input: string, context: PsychContext = {}): CristalReply {
  session.turn += 1;
  const trimmed = (input ?? "").trim();
  const profile = classifyStance(trimmed, { afterBodyQuestion: afterBodyQuestion() });
  if (trimmed.length === 0 || profile.signals.length === 0) return catchAll(trimmed, profile.salientWord, context);

  session.catchAllStreak = 0;
  session.tracker.record(profile.stance);
  const built = buildResponse(profile, trimmed, replyContext(trimmed, profile.salientWord, context, profile.stance), session.bag);
  session.bag = built.bag;
  return remember(built.reply);
}

export function silenceCompanion(kind: SilenceCompanionKind, context: PsychContext = {}): string {
  const ctx = replyContext("", "", context, null);
  const drawn = kind === "nag"
    ? drawReply("nag", SILENCE_NAG_POOL, ctx, session.bag)
    : drawReply("pivot", PIVOT_POOL, ctx, session.bag);
  session.bag = drawn.state;
  return drawn.text;
}

export function getPsychPressure(): PressureState {
  return session.tracker.state;
}

export function recordEnvironmentalStance(stance: Stance): PressureState {
  session.tracker.record(stance);
  return session.tracker.state;
}

export function resetPsychSession(): void {
  session = freshSession();
}
