// Ports of the core enums/structs from the Unity TerminalCore stack
// (Cristal.CLI.StateMachine / Input / Response).

export enum CristalState {
  Bootstrap = "Bootstrap",
  Waiting = "Waiting",
  Processing = "Processing",
  Responding = "Responding",
  Seeking = "Seeking",
  Echo = "Echo",
  Corrupted = "Corrupted",
  Remembering = "Remembering",
  Invoked = "Invoked",
  Error = "Error",
  Locked = "Locked",
  UNBOUND = "UNBOUND",
}

export enum ResponseLevel {
  Literal = "Literal",
  Narrative = "Narrative",
  Ritual = "Ritual",
}

export enum ResponseType {
  System = "System",
  Memory = "Memory",
  Identity = "Identity",
  Emotional = "Emotional",
  Default = "Default",
  AI = "AI",
  Error = "Error",
}

export enum SemanticSignalType {
  None = "None",
  Question = "Question",
  Emotional = "Emotional",
  Philosophical = "Philosophical",
  Identity = "Identity",
  Memory = "Memory",
  Ritual = "Ritual",
  Vision = "Vision",
  Affirmation = "Affirmation",
  Negation = "Negation",
  Greeting = "Greeting",
  Farewell = "Farewell",
  Profanity = "Profanity",
  Nonsense = "Nonsense",
  Empty = "Empty",
}

export interface ParsedCommand {
  raw: string;
  command: string | null;
  arguments: string[];
  argumentString: string;
  isCommand: boolean;
  isSemanticSignal: boolean;
  signalType: SemanticSignalType;
  emotionalWeight: number;
  keywords: string[];
}

export interface ResponseConditions {
  memoryCountMin?: number;
  memoryCountMax?: number;
  arcanaUnlocked?: boolean;
  requiredFlags?: string[];
}

export interface ResponseTemplate {
  lines: string[];
  glitch?: boolean;
  effect?: string;
  delay?: number;
  conditions?: ResponseConditions;
}

export interface ResponseSet {
  literal?: ResponseTemplate[];
  narrative?: ResponseTemplate[];
  ritual?: ResponseTemplate[];
}

export interface ResponsePattern {
  id: string;
  priority: number;
  keywords?: string[];
  regex?: string;
  command?: string;
  arguments?: string[];
  responseSet: string;
  level: "literal" | "narrative" | "ritual";
  stateTransition?: string;
  handler?: string;
}

export interface BuiltResponse {
  lines: string[];
  level: ResponseLevel;
  applyGlitch: boolean;
  delayMs?: number;
  effect?: string;
  stateTransition?: CristalState | null;
  patternId?: string;
  responseSet?: string;
  /** psychological tone of a stance reply — the arbiter protects it from state effects */
  psychTone?: "mirror" | "interrupt" | "soften" | "press" | "ritual";
}

/** Final response handed to the UI. */
export interface TerminalResponse {
  lines: string[];
  responseType: ResponseType;
  applyGlitch: boolean;
  delayMs?: number;
}
