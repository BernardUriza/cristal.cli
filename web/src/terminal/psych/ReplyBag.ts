import { fnv1a, mulberry32 } from "../../shared/rng";
import type { ReplyCondition, ReplyLine } from "./replyPool";

export interface ReplyContext {
  sessionId: string;
  turn: number;
  pressure: number;
  repeating: boolean;
  afterBodyQuestion: boolean;
  word: string;
  confessionFragment: string | null;
  invokedGlyph: string | null;
  objective: string | null;
}

export interface BagState {
  used: Record<string, string[]>;
  lastText: Record<string, string>;
}

export const DEFAULT_REPLY_CONTEXT: ReplyContext = {
  sessionId: "cristal",
  turn: 0,
  pressure: 0,
  repeating: false,
  afterBodyQuestion: false,
  word: "",
  confessionFragment: null,
  invokedGlyph: null,
  objective: null,
};

export function createBagState(): BagState {
  return { used: {}, lastText: {} };
}

const PLACEHOLDER = /\{(palabra|frase|glifo|objetivo)\}/g;

function placeholderValue(name: string, ctx: ReplyContext): string | null {
  switch (name) {
    case "palabra":
      return ctx.word || null;
    case "frase":
      return ctx.confessionFragment;
    case "glifo":
      return ctx.invokedGlyph ? ctx.invokedGlyph.toUpperCase() : null;
    case "objetivo":
      return ctx.objective;
    default:
      return null;
  }
}

function placeholdersIn(text: string): string[] {
  const names: string[] = [];
  text.replace(PLACEHOLDER, (_m, name: string) => {
    names.push(name);
    return "";
  });
  return names;
}

function conditionHolds(when: ReplyCondition, ctx: ReplyContext): boolean {
  if (when.pressureMin !== undefined && ctx.pressure < when.pressureMin) return false;
  if (when.pressureMax !== undefined && ctx.pressure > when.pressureMax) return false;
  if (when.repeating !== undefined && ctx.repeating !== when.repeating) return false;
  if (when.turnMin !== undefined && ctx.turn < when.turnMin) return false;
  if (when.hasConfession !== undefined && (ctx.confessionFragment !== null) !== when.hasConfession) return false;
  if (when.afterBodyQuestion !== undefined && ctx.afterBodyQuestion !== when.afterBodyQuestion) return false;
  return true;
}

function eligible(line: ReplyLine, ctx: ReplyContext): boolean {
  if (line.when && !conditionHolds(line.when, ctx)) return false;
  return placeholdersIn(line.text).every((name) => placeholderValue(name, ctx) !== null);
}

function specificity(line: ReplyLine, ctx: ReplyContext): number {
  const conditions = line.when ? Object.keys(line.when).length : 0;
  const names = placeholdersIn(line.text);
  const contextual = names.filter((name) => name !== "palabra").length;
  const mirrors = names.includes("palabra") && ctx.word ? 1 : 0;
  return conditions + contextual + mirrors;
}

export function substitutePlaceholders(text: string, ctx: ReplyContext): string {
  return text.replace(PLACEHOLDER, (_m, name: string) => placeholderValue(name, ctx) ?? "");
}

function shuffled(items: string[], rng: () => number): string[] {
  const copy = [...items];
  for (let i = copy.length - 1; i > 0; i--) {
    const j = Math.floor(rng() * (i + 1));
    [copy[i], copy[j]] = [copy[j], copy[i]];
  }
  return copy;
}

function freshestLine(
  levels: string[][],
  used: string[],
  lastText: string | undefined,
  rng: () => number
): string | null {
  for (const texts of levels) {
    const fresh = texts.filter((text) => !used.includes(text) && text !== lastText);
    if (fresh.length > 0) return shuffled(fresh, rng)[0];
  }
  return null;
}

export function drawReply(
  poolKey: string,
  lines: ReplyLine[],
  ctx: ReplyContext,
  state: BagState
): { text: string; state: BagState } {
  const candidates = lines.filter((line) => eligible(line, ctx));
  const pool = candidates.length > 0 ? candidates : lines.filter((line) => !line.when && placeholdersIn(line.text).length === 0);
  if (pool.length === 0) return { text: substitutePlaceholders(lines[0]?.text ?? "", ctx), state };

  const ranked = [...new Set(pool.map((line) => specificity(line, ctx)))].sort((a, b) => b - a);
  const levels = ranked.map((level) => pool.filter((line) => specificity(line, ctx) === level).map((line) => line.text));
  const lastText = state.lastText[poolKey];
  const rng = mulberry32(fnv1a(ctx.sessionId) ^ Math.imul(ctx.turn + 1, 0x9e3779b1));

  let used = state.used[poolKey] ?? [];
  let chosen = freshestLine(levels, used, lastText, rng);
  if (chosen === null) {
    used = [];
    chosen = freshestLine(levels, used, lastText, rng) ?? lastText ?? pool[0].text;
  }

  return {
    text: substitutePlaceholders(chosen, ctx),
    state: {
      used: { ...state.used, [poolKey]: [...used, chosen] },
      lastText: { ...state.lastText, [poolKey]: chosen },
    },
  };
}
