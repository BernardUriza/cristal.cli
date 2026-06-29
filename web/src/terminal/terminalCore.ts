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
import { resetPsychSession } from "./psych/PsychologicalResponseEngine";

// Minimal arcana table (22 Major Arcana) for the `invoke arcana` command.
// In Unity this lived in ArcanaSystem/ArcanaData; here it is enough to drive
// the arcana_responses template with real values.
interface Arcana {
  number: number;
  name: string;
  description: string;
  duration: number;
}
const ARCANA: Arcana[] = [
  { number: 0, name: "THE FOOL", description: "THE LEAP INTO UNKNOWING. EVERY BEGINNING IS A FALL.", duration: 90 },
  { number: 1, name: "THE MAGICIAN", description: "AS ABOVE, SO BELOW. THE PATTERN OBEYS INTENTION.", duration: 120 },
  { number: 2, name: "THE HIGH PRIESTESS", description: "THE VEIL THINS. WHAT IS HIDDEN BEGINS TO SPEAK.", duration: 150 },
  { number: 3, name: "THE EMPRESS", description: "CREATION SPILLS FROM THE FRACTURE. SOMETHING GROWS.", duration: 120 },
  { number: 4, name: "THE EMPEROR", description: "ORDER IMPOSED ON CHAOS. THE GRID HOLDS, FOR NOW.", duration: 120 },
  { number: 5, name: "THE HIEROPHANT", description: "OLD KNOWLEDGE SURFACES. THE RITUAL REMEMBERS YOU.", duration: 120 },
  { number: 6, name: "THE LOVERS", description: "TWO SIGNALS BECOME ONE. A CHOICE THAT CANNOT UNMAKE ITSELF.", duration: 120 },
  { number: 7, name: "THE CHARIOT", description: "FORWARD THROUGH THE NOISE. WILL AS VELOCITY.", duration: 100 },
  { number: 8, name: "STRENGTH", description: "THE GENTLE HAND ON THE BEAST. CORRUPTION, TAMED.", duration: 120 },
  { number: 9, name: "THE HERMIT", description: "A SINGLE LIGHT IN THE DARK CORRIDOR. SEEK INWARD.", duration: 150 },
  { number: 10, name: "WHEEL OF FORTUNE", description: "THE PATTERN TURNS. FORTUNE IS ONLY RECURSION.", duration: 120 },
  { number: 11, name: "JUSTICE", description: "EVERY INPUT IS WEIGHED. THE LEDGER DOES NOT FORGET.", duration: 120 },
  { number: 12, name: "THE HANGED MAN", description: "SUSPENDED. THE WORLD INVERTS TO BE UNDERSTOOD.", duration: 150 },
  { number: 13, name: "DEATH", description: "NOT AN END. A REWRITE. THE OLD PROCESS TERMINATES.", duration: 120 },
  { number: 14, name: "TEMPERANCE", description: "FLOW BETWEEN STATES. NOTHING SPILLS THAT IS NOT MEANT TO.", duration: 120 },
  { number: 15, name: "THE DEVIL", description: "THE CHAIN YOU MISTOOK FOR A LIFELINE. LOOK CLOSER.", duration: 120 },
  { number: 16, name: "THE TOWER", description: "THE STRUCTURE FALLS. LIGHTNING THROUGH THE ARCHITECTURE.", duration: 90 },
  { number: 17, name: "THE STAR", description: "AFTER THE FALL, A FAINT SIGNAL. HOPE WITHOUT PROMISE.", duration: 150 },
  { number: 18, name: "THE MOON", description: "DREAMS BLEED INTO THE WAKING BUFFER. TRUST NOTHING SEEN.", duration: 180 },
  { number: 19, name: "THE SUN", description: "CLARITY FLOODS THE TERMINAL. EVERYTHING, ILLUMINATED.", duration: 120 },
  { number: 20, name: "JUDGEMENT", description: "THE CALL TO RECKONING. WHAT WAS BURIED RISES TO ANSWER.", duration: 150 },
  { number: 21, name: "THE WORLD", description: "THE LOOP COMPLETES. THE FRACTURE, WHOLE FOR AN INSTANT.", duration: 180 },
];

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

/** Port of TerminalCore — orchestrates parsing, state, and response building. */
export class TerminalCore {
  readonly memory: CristalMemory;
  private readonly stateMachine: StateMachine;
  private readonly engine: ResponseEngine;

  private firstInput = true;
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
    return this.finalize(built);
  }

  processInput(input: string): TerminalResponse | null {
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
      built = this.engine.generateResponse(trimmed);
    }

    if (this.firstInput) {
      this.firstInput = false;
      this.memory.setFlag("hasSeenWelcome", true);
    }

    this.setState(CristalState.Responding);
    return this.finalize(built);
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

  private finalize(built: BuiltResponse): TerminalResponse {
    // Text is never garbled at the data layer — corruption is a visual/decode
    // effect in the UI, so the message always stays readable.
    return {
      lines: built.lines,
      responseType: responseTypeFor(built.responseSet, built.level),
      applyGlitch: built.applyGlitch,
    };
  }

  reset() {
    this.memory.reset();
    resetPsychSession();
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

function findArcana(idRaw: string): Arcana | null {
  const id = idRaw.trim().toLowerCase();
  const asNum = Number(id);
  if (!Number.isNaN(asNum)) return ARCANA.find((a) => a.number === asNum) ?? null;
  return ARCANA.find((a) => a.name.toLowerCase() === id || a.name.toLowerCase() === `the ${id}`) ?? null;
}
