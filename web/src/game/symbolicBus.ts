export type SymbolicArchetype =
  | "fragment"
  | "echo"
  | "corruption"
  | "memory"
  | "moon"
  | "gate"
  | "vision";

export type SymbolicSignal = "invoked" | "progress" | "complete";

export interface SymbolicEvent {
  signal: SymbolicSignal;
  archetype: SymbolicArchetype;
  intensity: number;
  at: number;
}

type Listener = (event: SymbolicEvent) => void;

const listeners = new Set<Listener>();

export const symbolicBus = {
  subscribe(fn: Listener): () => void {
    listeners.add(fn);
    return () => listeners.delete(fn);
  },
  emit(event: Omit<SymbolicEvent, "at">): SymbolicEvent {
    const full: SymbolicEvent = { ...event, at: performance.now() };
    listeners.forEach((listener) => listener(full));
    return full;
  },
};

if (import.meta.env.DEV) {
  (window as unknown as { __bus: typeof symbolicBus }).__bus = symbolicBus;
}
