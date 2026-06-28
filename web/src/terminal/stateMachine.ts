import { CristalState } from "./types";

// Port of the relevant parts of TerminalStateMachine + the per-state
// StateResponseModifier values from TerminalStates.cs.

export interface StateResponseModifier {
  prefix: string;
  suffix: string;
  glitchMultiplier: number;
  forceUppercase: boolean;
  displayName: string;
}

const MODIFIERS: Record<CristalState, StateResponseModifier> = {
  [CristalState.Bootstrap]: { prefix: "//BOOT: ", suffix: "", glitchMultiplier: 1, forceUppercase: false, displayName: "INITIALIZING" },
  [CristalState.Waiting]: { prefix: "", suffix: "", glitchMultiplier: 1, forceUppercase: false, displayName: "AWAITING INPUT" },
  [CristalState.Processing]: { prefix: "", suffix: "", glitchMultiplier: 0.5, forceUppercase: false, displayName: "PROCESSING" },
  [CristalState.Responding]: { prefix: "", suffix: "", glitchMultiplier: 1, forceUppercase: false, displayName: "RESPONDING" },
  [CristalState.Seeking]: { prefix: "//SEEKING: ", suffix: "", glitchMultiplier: 1.5, forceUppercase: false, displayName: "SEEKING" },
  [CristalState.Echo]: { prefix: "ECHO: ", suffix: "", glitchMultiplier: 0.3, forceUppercase: true, displayName: "ECHO" },
  [CristalState.Corrupted]: { prefix: "", suffix: "", glitchMultiplier: 3, forceUppercase: false, displayName: "C̴O̵R̷R̵U̴P̷T̷E̵D̴" },
  [CristalState.Remembering]: { prefix: "//MEMORY: ", suffix: "", glitchMultiplier: 1.2, forceUppercase: false, displayName: "REMEMBERING" },
  [CristalState.Invoked]: { prefix: "", suffix: "", glitchMultiplier: 2, forceUppercase: false, displayName: "INVOKED" },
  [CristalState.Error]: { prefix: "//ERROR: ", suffix: "", glitchMultiplier: 5, forceUppercase: false, displayName: "ERROR" },
  [CristalState.Locked]: { prefix: "//LOCKED: ", suffix: "", glitchMultiplier: 0, forceUppercase: false, displayName: "LOCKED" },
  [CristalState.UNBOUND]: { prefix: "", suffix: "", glitchMultiplier: 5, forceUppercase: false, displayName: "U̸̧N̷̨B̶͜O̸̕U̵̢N̸̛D̷̕" },
};

function containsAny(text: string, ...keywords: string[]): boolean {
  return keywords.some((k) => text.includes(k));
}

export class StateMachine {
  private current: CristalState = CristalState.Waiting;

  get currentState(): CristalState {
    return this.current;
  }

  getModifier(): StateResponseModifier {
    return MODIFIERS[this.current];
  }

  transitionTo(state: CristalState) {
    this.current = state;
  }

  // Port of DetermineStateFromInput.
  determineStateFromInput(input: string): CristalState | null {
    const lower = input.toLowerCase();
    if (containsAny(lower, "remember", "memory", "recall", "past", "before")) return CristalState.Remembering;
    if (containsAny(lower, "echo", "repeat", "mirror", "reflect")) return CristalState.Echo;
    if (containsAny(lower, "afraid", "scared", "lost", "alone", "seek", "search", "find")) return CristalState.Seeking;
    if (containsAny(lower, "corrupt", "glitch", "break", "destroy", "chaos")) return CristalState.Corrupted;
    if (containsAny(lower, "invoke", "arcana", "summon", "call")) return CristalState.Invoked;
    if (containsAny(lower, "error", "fault", "fail")) return CristalState.Error;
    if (containsAny(lower, "lock", "close", "shut")) return CristalState.Locked;
    return null;
  }
}

export function stateTransitionFromString(s: string | undefined): CristalState | null {
  if (!s) return null;
  const key = s.toUpperCase();
  const map: Record<string, CristalState> = {
    BOOTSTRAP: CristalState.Bootstrap,
    WAITING: CristalState.Waiting,
    PROCESSING: CristalState.Processing,
    RESPONDING: CristalState.Responding,
    SEEKING: CristalState.Seeking,
    ECHO: CristalState.Echo,
    CORRUPTED: CristalState.Corrupted,
    REMEMBERING: CristalState.Remembering,
    INVOKED: CristalState.Invoked,
    ERROR: CristalState.Error,
    LOCKED: CristalState.Locked,
    UNBOUND: CristalState.UNBOUND,
  };
  return map[key] ?? null;
}
