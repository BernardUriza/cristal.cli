import { ParsedCommand, ResponsePattern } from "./types";
import { hasArgument } from "./inputParser";

// Port of Assets/Data/Responses/patterns.json (the authoritative pattern list)
// plus the PatternMatcher scoring logic.
export const DEFAULT_PATTERNS: ResponsePattern[] = [
  { id: "help_query", priority: 100, command: "help", responseSet: "help_responses", level: "literal" },
  { id: "status_query", priority: 90, command: "status", keywords: ["status", "state", "condition"], responseSet: "status_responses", level: "literal" },
  { id: "invoke_arcana", priority: 100, command: "invoke", regex: "^invoke\\s+arcana\\s+(\\w+|\\d+)$", responseSet: "arcana_responses", level: "ritual", stateTransition: "INVOKED", handler: "ArcanaSystem" },
  { id: "read_command", priority: 100, command: "read", regex: "^read\\s+(.+)$", responseSet: "read_responses", level: "literal" },
  { id: "memory_query", priority: 10, keywords: ["remember", "memory", "recall", "past", "forgot"], responseSet: "memory_responses", level: "narrative", stateTransition: "REMEMBERING" },
  { id: "identity_query", priority: 9, keywords: ["who am i", "what am i", "identity", "my name"], regex: "(who|what)\\s+(am|are)\\s+(i|you)", responseSet: "identity_responses", level: "ritual" },
  { id: "emotional_fear", priority: 5, keywords: ["afraid", "scared", "fear", "terrified", "lost", "alone", "miedo", "asustado", "asustada", "perdido", "perdida", "solo", "sola", "dolor", "duele", "adolorido", "adolorida", "cansado", "cansada", "triste", "vacío", "vacio", "oscuridad", "ansiedad", "angustia"], responseSet: "emotional_fear", level: "narrative", stateTransition: "SEEKING" },
  { id: "emotional_hope", priority: 5, keywords: ["hope", "light", "love", "peace", "warm", "esperanza", "luz", "amor", "paz", "calma", "calor", "tranquilo", "tranquila", "feliz", "alegría", "alegria"], responseSet: "emotional_hope", level: "narrative" },
  { id: "echo_trigger", priority: 7, keywords: ["echo", "repeat", "mirror", "reflect"], responseSet: "echo_responses", level: "narrative", stateTransition: "ECHO" },
  { id: "corrupt_trigger", priority: 6, keywords: ["corrupt", "glitch", "break", "chaos", "destroy"], responseSet: "corrupt_responses", level: "ritual", stateTransition: "CORRUPTED" },
  { id: "exit_attempt", priority: 8, keywords: ["exit", "quit", "leave", "escape", "goodbye"], responseSet: "exit_responses", level: "narrative" },
  { id: "truth_query", priority: 7, keywords: ["truth", "real", "true", "lie", "false"], responseSet: "truth_responses", level: "ritual" },
  { id: "why_query", priority: 6, keywords: ["why"], regex: "^why\\??$", responseSet: "why_responses", level: "narrative" },
];

const compiled = new Map<string, RegExp>();
for (const p of DEFAULT_PATTERNS) {
  if (p.regex) {
    try {
      compiled.set(p.id, new RegExp(p.regex, "i"));
    } catch {
      /* skip invalid regex */
    }
  }
}

function calculateMatchScore(pattern: ResponsePattern, command: ParsedCommand): number {
  let score = 0;
  const lower = command.raw.toLowerCase();

  if (pattern.command) {
    if (command.isCommand && command.command === pattern.command) {
      score += 100;
      if (pattern.arguments && pattern.arguments.length > 0) {
        const hasAll = pattern.arguments.every((a) => hasArgument(command, a));
        if (hasAll) score += 50;
        else return 0;
      }
    } else {
      return 0;
    }
  }

  const rx = compiled.get(pattern.id);
  if (rx && rx.test(command.raw)) score += 80;

  if (pattern.keywords && pattern.keywords.length > 0) {
    let kw = 0;
    for (const k of pattern.keywords) if (lower.includes(k.toLowerCase())) kw++;
    if (kw > 0) score += kw * 10;
  }

  return score;
}

export function matchPattern(command: ParsedCommand): ResponsePattern | null {
  const matches: { pattern: ResponsePattern; score: number }[] = [];
  for (const p of DEFAULT_PATTERNS) {
    const score = calculateMatchScore(p, command);
    if (score > 0) matches.push({ pattern: p, score });
  }
  if (matches.length === 0) return null;
  matches.sort((a, b) => {
    const pr = b.pattern.priority - a.pattern.priority;
    return pr !== 0 ? pr : b.score - a.score;
  });
  return matches[0].pattern;
}
