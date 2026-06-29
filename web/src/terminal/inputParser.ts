import { ParsedCommand, SemanticSignalType } from "./types";

// Port of Cristal.CLI.Input.InputParser.

const KNOWN_COMMANDS = new Set<string>([
  "help", "status", "clear", "reset", "save", "load", "export",
  "read", "list", "show", "view",
  "see", "visions", "vision",
  "invoke", "summon", "activate", "unlock",
  "remember", "recall", "forget", "log",
  "echo", "corrupt", "stabilize", "seek",
]);

const POSITIVE = new Set(["hope", "love", "happy", "joy", "peace", "light", "warm", "trust", "beautiful", "good", "yes", "thank"]);
const NEGATIVE = new Set(["fear", "hate", "scared", "afraid", "alone", "lost", "dark", "pain", "cold", "empty", "dead", "sad", "angry"]);
const PHILOSOPHICAL = new Set(["why", "meaning", "purpose", "truth", "real", "exist", "life", "death", "soul", "consciousness"]);
const IDENTITY = new Set(["who", "what", "am", "identity", "name", "self"]);
const MEMORY = new Set(["remember", "memory", "recall", "past", "before", "forgot", "history"]);
const RITUAL = new Set(["invoke", "summon", "arcana", "ritual", "activate", "awaken", "call"]);

const STOP_WORDS = new Set([
  "the", "a", "an", "is", "are", "was", "were", "am", "i", "you", "we", "they", "it",
  "to", "of", "and", "or", "in", "on", "at", "for", "with", "do", "does", "did",
  "have", "has", "had", "be", "been", "being", "my", "your", "our", "their",
]);

const COMMAND_PATTERN = /^(\w+)\s*(.*?)$/i;

function clamp(v: number, lo: number, hi: number) {
  return Math.max(lo, Math.min(hi, v));
}

function containsAny(text: string, set: Set<string>): boolean {
  for (const k of set) if (text.includes(k)) return true;
  return false;
}

export function parse(input: string): ParsedCommand {
  const result: ParsedCommand = {
    raw: input ?? "",
    command: null,
    arguments: [],
    argumentString: "",
    isCommand: false,
    isSemanticSignal: false,
    signalType: SemanticSignalType.None,
    emotionalWeight: 0,
    keywords: [],
  };

  if (!input || input.trim().length === 0) {
    result.isSemanticSignal = true;
    result.signalType = SemanticSignalType.Empty;
    return result;
  }

  const trimmed = input.trim();
  const lower = trimmed.toLowerCase();

  result.keywords = extractKeywords(trimmed);
  result.emotionalWeight = calculateEmotionalWeight(lower);

  const match = COMMAND_PATTERN.exec(trimmed);
  if (match) {
    const potentialCommand = match[1].toLowerCase();
    const argumentPart = match[2].trim();
    if (KNOWN_COMMANDS.has(potentialCommand)) {
      result.isCommand = true;
      result.command = potentialCommand;
      result.argumentString = argumentPart;
      result.arguments = parseArguments(argumentPart);
      result.signalType = SemanticSignalType.None;
      return result;
    }
  }

  result.isCommand = false;
  result.isSemanticSignal = true;
  result.signalType = classifySemanticSignal(lower, trimmed);
  return result;
}

function parseArguments(argumentString: string): string[] {
  if (!argumentString.trim()) return [];
  const args: string[] = [];
  let current = "";
  let inQuotes = false;
  for (const c of argumentString) {
    if (c === '"' || c === "'") inQuotes = !inQuotes;
    else if (c === " " && !inQuotes) {
      if (current.trim()) {
        args.push(current);
        current = "";
      }
    } else current += c;
  }
  if (current.trim()) args.push(current);
  return args;
}

function classifySemanticSignal(lower: string, original: string): SemanticSignalType {
  if (isNonsense(original)) return SemanticSignalType.Nonsense;
  if (containsProfanity(lower)) return SemanticSignalType.Profanity;
  if (isGreeting(lower)) return SemanticSignalType.Greeting;
  if (isFarewell(lower)) return SemanticSignalType.Farewell;
  if (isAffirmation(lower)) return SemanticSignalType.Affirmation;
  if (isNegation(lower)) return SemanticSignalType.Negation;
  if (containsAny(lower, IDENTITY) && (lower.includes("?") || lower.includes("who") || lower.includes("what")))
    return SemanticSignalType.Identity;
  if (containsAny(lower, MEMORY)) return SemanticSignalType.Memory;
  if (containsAny(lower, RITUAL)) return SemanticSignalType.Ritual;
  if (containsAny(lower, PHILOSOPHICAL)) return SemanticSignalType.Philosophical;
  if (lower.includes("?")) return SemanticSignalType.Question;
  if (containsAny(lower, POSITIVE) || containsAny(lower, NEGATIVE)) return SemanticSignalType.Emotional;
  return SemanticSignalType.None;
}

function extractKeywords(input: string): string[] {
  const words = input.toLowerCase().split(/[\s,.!?;:"'/\\]+/).filter(Boolean);
  return words.filter((w) => w.length >= 3 && !STOP_WORDS.has(w));
}

function calculateEmotionalWeight(lower: string): number {
  let weight = 0;
  for (const w of POSITIVE) if (lower.includes(w)) weight += 0.5;
  for (const w of NEGATIVE) if (lower.includes(w)) weight -= 0.5;
  if (lower.includes("!") || lower.includes("?!")) weight *= 1.2;
  if (lower.includes("very") || lower.includes("so much") || lower.includes("really")) weight *= 1.3;
  if (lower.includes("always") || lower.includes("never")) weight *= 1.2;
  return clamp(weight, -2, 2);
}

function isNonsense(input: string): boolean {
  let alpha = 0;
  for (const c of input) if (/[a-zA-Z]/.test(c)) alpha++;
  return input.length > 0 && alpha / input.length < 0.3;
}

function containsProfanity(lower: string): boolean {
  return ["fuck", "shit", "damn", "hell", "ass"].some((w) => lower.includes(w));
}

function firstWord(lower: string): string {
  return lower.split(" ")[0].replace(/[!.,]+$/, "");
}

function isGreeting(lower: string): boolean {
  return new Set(["hello", "hi", "hey", "greetings", "hola", "howdy"]).has(firstWord(lower));
}

function isFarewell(lower: string): boolean {
  const fw = new Set(["bye", "goodbye", "exit", "quit", "leave", "farewell", "adios"]);
  return fw.has(firstWord(lower)) || lower.includes("good bye");
}

function isAffirmation(lower: string): boolean {
  const aff = new Set(["yes", "ok", "okay", "sure", "continue", "proceed", "go", "si", "yep", "yeah"]);
  const trimmed = lower.replace(/[!.,?]+$/, "");
  return aff.has(trimmed) || aff.has(lower.split(" ")[0]);
}

function isNegation(lower: string): boolean {
  const neg = new Set(["no", "stop", "cancel", "don't", "dont", "never", "nope"]);
  const trimmed = lower.replace(/[!.,?]+$/, "");
  return neg.has(trimmed) || neg.has(lower.split(" ")[0]);
}

export function hasArgument(cmd: ParsedCommand, arg: string): boolean {
  return cmd.arguments.some((a) => a.toLowerCase() === arg.toLowerCase());
}

export function getArgument(cmd: ParsedCommand, index: number): string | null {
  return cmd.arguments[index] ?? null;
}
