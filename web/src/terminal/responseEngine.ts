import {
  BuiltResponse,
  ParsedCommand,
  ResponseLevel,
  ResponseSet,
  ResponseTemplate,
  ResponsePattern,
  SemanticSignalType,
} from "./types";
import { parse, getArgument } from "./inputParser";
import { matchPattern } from "./patterns";
import { RESPONSE_SETS } from "./responses";
import { CristalMemory } from "./memory";
import { StateMachine, stateTransitionFromString } from "./stateMachine";
import { generateCristalPsychReply } from "./psych/PsychologicalResponseEngine";
import { arbitrate } from "./psych/ToneArbitrator";

const VARIABLE_PATTERN = /\{(\w+)\}/g;
const NARRATIVE_THRESHOLD = 0.3;
const RITUAL_THRESHOLD = 0.6;

function patternLevel(level: ResponsePattern["level"]): ResponseLevel {
  return level === "narrative"
    ? ResponseLevel.Narrative
    : level === "ritual"
    ? ResponseLevel.Ritual
    : ResponseLevel.Literal;
}

function templatesForLevel(set: ResponseSet, level: ResponseLevel): ResponseTemplate[] | undefined {
  if (level === ResponseLevel.Narrative) return set.narrative;
  if (level === ResponseLevel.Ritual) return set.ritual;
  return set.literal;
}

export class ResponseEngine {
  constructor(private memory: CristalMemory, private state: StateMachine) {}

  generateResponse(input: string): BuiltResponse {
    const command = parse(input);

    // Log to memory (mirrors ResponseEngine.GenerateResponse).
    this.memory.logCommand(input, command.keywords, command.emotionalWeight);

    const pattern = matchPattern(command);

    // Scripted commands (help / status / read / invoke) keep their canned
    // responses; everything else is a feeling and goes through the psychological
    // stance engine instead of keyword-bucket matching. The state machine still
    // reacts to keywords separately (TerminalCore), so this only swaps the words.
    if (pattern && pattern.command) {
      const level = this.determineLevel(command, pattern);
      const response = this.build(pattern, command, level);
      const transition = stateTransitionFromString(pattern.stateTransition);
      if (transition) this.state.transitionTo(transition);
      this.applyStateModifiers(response);
      return response;
    }

    const reply = generateCristalPsychReply(input);
    const response: BuiltResponse = {
      lines: ["", reply.text, ""],
      level: ResponseLevel.Narrative,
      applyGlitch: true,
      responseSet: "emotional_psych",
      psychTone: reply.tone,
    };
    this.applyStateModifiers(response);
    return response;
  }

  generateWelcome(): BuiltResponse {
    return this.buildFromSet("welcome_responses", ResponseLevel.Literal, parse(""));
  }

  /** Build directly from a named set (used by the arcana branch). */
  buildFromSet(
    setName: string,
    level: ResponseLevel,
    command: ParsedCommand,
    extra?: Record<string, string>
  ): BuiltResponse {
    const set = RESPONSE_SETS[setName];
    if (!set) return this.buildFallback(command);
    let templates = templatesForLevel(set, level);
    if (!templates || templates.length === 0) templates = set.literal;
    if (!templates || templates.length === 0) return this.buildFallback(command);
    const template = this.selectTemplate(templates, extra);
    if (!template) return this.buildFallback(command);
    return this.buildFromTemplate(template, undefined, command, level, setName, extra);
  }

  substitute(text: string, command: ParsedCommand, extra?: Record<string, string>): string {
    return text.replace(VARIABLE_PATTERN, (_m, name: string) =>
      this.getVariableValue(name.toLowerCase(), command, extra)
    );
  }

  private build(pattern: ResponsePattern, command: ParsedCommand, level: ResponseLevel): BuiltResponse {
    const set = RESPONSE_SETS[pattern.responseSet];
    if (!set) return this.buildFallback(command);
    let templates = templatesForLevel(set, level);
    if (!templates || templates.length === 0) templates = set.literal;
    if (!templates || templates.length === 0) return this.buildFallback(command);
    const template = this.selectTemplate(templates);
    if (!template) return this.buildFallback(command);
    return this.buildFromTemplate(template, pattern, command, level, pattern.responseSet);
  }

  private buildFallback(command: ParsedCommand): BuiltResponse {
    const set = RESPONSE_SETS["default_responses"];
    return this.buildFromTemplate(set.literal![0], undefined, command, ResponseLevel.Literal, "default_responses");
  }

  private selectTemplate(
    templates: ResponseTemplate[],
    extra?: Record<string, string>
  ): ResponseTemplate | null {
    const valid = templates.filter((t) => this.checkConditions(t, extra));
    if (valid.length === 0) return null;
    if (valid.length === 1) return valid[0];
    return valid[Math.floor(Math.random() * valid.length)];
  }

  private checkConditions(template: ResponseTemplate, extra?: Record<string, string>): boolean {
    const c = template.conditions;
    if (!c) return true;
    if (c.memoryCountMin != null && c.memoryCountMin >= 0 && this.memory.commandCount < c.memoryCountMin) return false;
    if (c.memoryCountMax != null && c.memoryCountMax >= 0 && this.memory.commandCount > c.memoryCountMax) return false;
    if (c.requiredFlags) for (const f of c.requiredFlags) if (!this.memory.getFlag(f)) return false;
    // arcanaUnlocked is matched against the extra context flag when present.
    if (c.arcanaUnlocked !== undefined && extra) {
      const unlocked = extra["_arcana_unlocked"] === "true";
      if (c.arcanaUnlocked !== unlocked) return false;
    }
    return true;
  }

  private buildFromTemplate(
    template: ResponseTemplate,
    pattern: ResponsePattern | undefined,
    command: ParsedCommand,
    level: ResponseLevel,
    responseSet: string,
    extra?: Record<string, string>
  ): BuiltResponse {
    return {
      lines: template.lines.map((l) => this.substitute(l, command, extra)),
      level,
      applyGlitch: !!template.glitch,
      effect: template.effect,
      stateTransition: stateTransitionFromString(pattern?.stateTransition),
      patternId: pattern?.id,
      responseSet,
    };
  }

  private determineLevel(command: ParsedCommand, pattern: ResponsePattern | null): ResponseLevel {
    if (pattern) return patternLevel(pattern.level);

    const progression = this.calculateProgressionScore();
    if (progression >= RITUAL_THRESHOLD) return ResponseLevel.Ritual;
    if (progression >= NARRATIVE_THRESHOLD) return ResponseLevel.Narrative;

    if (Math.abs(command.emotionalWeight) >= 1.5) return ResponseLevel.Narrative;

    if (
      command.signalType === SemanticSignalType.Philosophical ||
      command.signalType === SemanticSignalType.Identity ||
      command.signalType === SemanticSignalType.Ritual
    ) {
      return ResponseLevel.Narrative;
    }
    return ResponseLevel.Literal;
  }

  private calculateProgressionScore(): number {
    let score = 0;
    score += Math.min(this.memory.commandCount / 50, 0.3);
    score += Math.min(this.memory.discoveredKeywordCount / 20, 0.2);
    score += Math.min(this.memory.arcanaUnlockedCount / 7, 0.3);
    score += Math.min(this.memory.majorEventsCount / 5, 0.2);
    return Math.max(0, Math.min(1, score));
  }

  private applyStateModifiers(response: BuiltResponse) {
    // Psychology rules over the visual state effect: a tender reply is never
    // shouted or shattered, whatever state the machine is in.
    const m = arbitrate(response.psychTone, this.state.getModifier());

    if (m.glitchMultiplier > 1 && !response.applyGlitch) {
      response.applyGlitch = Math.random() < m.glitchMultiplier - 1;
    }

    if (m.prefix && response.lines.length > 0) {
      for (let i = 0; i < response.lines.length; i++) {
        if (response.lines[i].trim().length > 0) {
          response.lines[i] = m.prefix + response.lines[i];
          break;
        }
      }
    }

    if (m.suffix && response.lines.length > 0) response.lines.push(m.suffix);

    if (m.forceUppercase) {
      response.lines = response.lines.map((l) => l.toUpperCase());
    }
  }

  private getVariableValue(name: string, command: ParsedCommand, extra?: Record<string, string>): string {
    if (extra && extra[name] !== undefined) return extra[name];
    switch (name) {
      case "session_id":
        return this.memory.sessionId;
      case "memory_count":
        return String(this.memory.commandCount);
      case "current_state":
        return this.state.currentState.toString();
      case "corruption_level":
        return `${Math.round(this.memory.corruptionLevel * 100)}%`;
      case "emotional_state":
        return this.memory.dominantEmotion;
      case "player_input":
        return command.raw.toUpperCase();
      case "random_memory": {
        const c = this.memory.getRandomCommand();
        return c ? `"${c.input}"` : "//NO MEMORIES FOUND";
      }
      case "top_keywords": {
        const k = this.memory.getTopKeywords(3);
        return k.length ? k.join(", ") : "NONE";
      }
      case "arcana_number":
        return getArgument(command, 1) ?? "?";
      case "arcana_name":
        return "THE UNKNOWN";
      case "arcana_description":
        return "A MYSTERY AWAITS";
      case "arcana_duration":
        return "120";
      case "read_path":
        return getArgument(command, 0) ?? "/null";
      case "read_content":
        return "//FILE NOT FOUND OR ACCESS DENIED";
      case "timestamp":
        return new Date().toTimeString().slice(0, 8);
      case "date":
        return new Date().toISOString().slice(0, 10);
      default:
        return `[${name}]`;
    }
  }
}
