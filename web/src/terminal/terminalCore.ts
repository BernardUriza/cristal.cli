import {
  BuiltResponse,
  CristalState,
  ResponseLevel,
  ResponseType,
  TerminalResponse,
} from "./types";
import { parse, getArgument } from "./inputParser";
import { CristalMemory } from "./memory";
import { StateMachine } from "./stateMachine";
import { ResponseEngine } from "./responseEngine";
import {
  getPsychPressure,
  resetPsychSession,
  silenceCompanion,
  type PsychContext,
} from "./psych/PsychologicalResponseEngine";
import {
  advanceSilence,
  applySilencePolicy,
  createInitialSilenceState,
  type SilenceState,
} from "./psych/SilenceEngine";
import { shapeResponse } from "./responseShaper";
import { findArcana } from "./arcana";

function responseTypeFor(set: string | undefined, level: ResponseLevel): ResponseType {
  if (!set) {
    return level === ResponseLevel.Ritual
      ? ResponseType.Identity
      : level === ResponseLevel.Narrative
      ? ResponseType.Memory
      : ResponseType.Default;
  }
  if (["help_responses", "status_responses", "welcome_responses", "read_responses"].includes(set))
    return ResponseType.System;
  if (set.startsWith("emotional")) return ResponseType.Emotional;
  if (set === "memory_responses") return ResponseType.Memory;
  if (set === "identity_responses") return ResponseType.Identity;
  if (set === "corrupt_responses") return ResponseType.Error;
  // ritual-feeling sets (arcana, truth) -> Identity tone
  return level === ResponseLevel.Ritual
    ? ResponseType.Identity
    : level === ResponseLevel.Narrative
    ? ResponseType.Memory
    : ResponseType.Default;
}

type Listener<T> = (value: T) => void;

export type ConsoleContext = Omit<PsychContext, "sessionId">;

/** Port of TerminalCore — orchestrates parsing, state, and response building. */
export class TerminalCore {
  readonly memory: CristalMemory;
  private readonly stateMachine: StateMachine;
  private readonly engine: ResponseEngine;

  private firstInput = true;
  private silenceState: SilenceState = createInitialSilenceState();
  private stateListeners: Listener<CristalState>[] = [];

  constructor() {
    this.memory = new CristalMemory();
    this.stateMachine = new StateMachine();
    this.engine = new ResponseEngine(this.memory, this.stateMachine);
  }

  get sessionId(): string {
    return this.memory.sessionId;
  }

  get currentState(): CristalState {
    return this.stateMachine.currentState;
  }

  onStateChanged(fn: Listener<CristalState>): () => void {
    this.stateListeners.push(fn);
    return () => {
      this.stateListeners = this.stateListeners.filter((f) => f !== fn);
    };
  }

  private setState(state: CristalState) {
    this.stateMachine.transitionTo(state);
    this.stateListeners.forEach((f) => f(state));
  }

  /** Welcome banner shown when the console connects. */
  welcome(): TerminalResponse {
    const built = this.engine.generateWelcome();
    return this.finalize(built, "welcome");
  }

  processInput(input: string, context: ConsoleContext = {}): TerminalResponse | null {
    if (!input || !input.trim()) return null;
    const trimmed = input.trim();

    this.setState(CristalState.Processing);

    const command = parse(trimmed);
    let built: BuiltResponse;

    if (command.isCommand && command.command === "invoke" && command.arguments[0]?.toLowerCase() === "arcana") {
      built = this.handleArcanaInvoke(command);
      this.setState(CristalState.Invoked);
    } else {
      const suggested = this.stateMachine.determineStateFromInput(trimmed);
      if (suggested) this.stateMachine.transitionTo(suggested);
      built = this.engine.generateResponse(trimmed, context);
    }

    if (built.responseSet === "emotional_psych" && built.psychStance) {
      const next = advanceSilence(this.silenceState, {
        stance: built.psychStance,
        pressure: getPsychPressure().pressure,
      });
      this.silenceState = next.state;
      const companion =
        next.policy.companion === "none" ? undefined : silenceCompanion(next.policy.companion, context);
      built = {
        ...built,
        lines: applySilencePolicy(built.lines, next.policy, companion),
        delayMs: next.policy.delayMs,
      };
    }

    if (this.firstInput) {
      this.firstInput = false;
      this.memory.setFlag("hasSeenWelcome", true);
    }

    this.setState(CristalState.Responding);
    return this.finalize(built, "input");
  }

  private handleArcanaInvoke(command: ReturnType<typeof parse>): BuiltResponse {
    // arg 0 is "arcana", arg 1 is the identifier (number or name).
    const idRaw = getArgument(command, 1);
    const arcana = idRaw ? findArcana(idRaw) : null;

    if (arcana) {
      this.memory.unlockArcana(String(arcana.number));
      this.memory.recordMajorEvent(`invoked:${arcana.name}`);
      return this.engine.buildFromSet("arcana_responses", ResponseLevel.Ritual, command, {
        _arcana_unlocked: "true",
        arcana_number: String(arcana.number),
        arcana_name: arcana.name,
        arcana_description: arcana.description,
        arcana_duration: String(arcana.duration),
      });
    }

    return this.engine.buildFromSet("arcana_responses", ResponseLevel.Ritual, command, {
      _arcana_unlocked: "false",
      arcana_number: idRaw ?? "?",
    });
  }

  private finalize(built: BuiltResponse, context: "welcome" | "input"): TerminalResponse {
    // Text is never garbled at the data layer — corruption is a visual/decode
    // effect in the UI, so the message always stays readable.
    return shapeResponse({
      lines: built.lines,
      responseType: responseTypeFor(built.responseSet, built.level),
      applyGlitch: built.applyGlitch,
      delayMs: built.delayMs,
    }, context);
  }

  reset() {
    this.memory.reset();
    resetPsychSession();
    this.silenceState = createInitialSilenceState();
    this.firstInput = true;
    this.setState(CristalState.Waiting);
  }
}

let _instance: TerminalCore | null = null;
/** Shared singleton so memory/state persist across console open/close. */
export function getTerminalCore(): TerminalCore {
  if (!_instance) _instance = new TerminalCore();
  return _instance;
}
