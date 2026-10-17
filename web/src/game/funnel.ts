export const FUNNEL_STEPS = [
  "laberinto",
  "pointer_lock",
  "first_step",
  "console_open",
  "first_phrase",
  "glyph_invoked",
  "door_crossed",
] as const;

export type FunnelStep = (typeof FUNNEL_STEPS)[number];

export interface FunnelState {
  sessionId: string;
  startedAt: number;
  reached: Partial<Record<FunnelStep, number>>;
}

const STORAGE_KEY = "cristal.funnel.v1";

export function createFunnel(sessionId: string, startedAt: number): FunnelState {
  return { sessionId, startedAt, reached: {} };
}

export function reachFunnelStep(
  state: FunnelState,
  step: FunnelStep,
  now: number
): { state: FunnelState; seconds: number | null } {
  if (state.reached[step] !== undefined) return { state, seconds: null };
  const seconds = Math.max(0, Math.round(((now - state.startedAt) / 1000) * 10) / 10);
  return { state: { ...state, reached: { ...state.reached, [step]: seconds } }, seconds };
}

export function funnelProgress(state: FunnelState): number {
  return FUNNEL_STEPS.filter((step) => state.reached[step] !== undefined).length;
}

export function nextVerb(state: FunnelState): string | null {
  if (state.reached.pointer_lock === undefined) return "click para mirar";
  if (state.reached.first_step === undefined) return "W A S D para caminar";
  return null;
}

export function randomSessionId(random: () => number): string {
  const alphabet = "abcdefghijklmnopqrstuvwxyz0123456789";
  let id = "";
  for (let i = 0; i < 12; i++) id += alphabet[Math.floor(random() * alphabet.length)];
  return id;
}

export function loadFunnel(sessionId: string, now: number): FunnelState {
  if (typeof window === "undefined") return createFunnel(sessionId, now);
  try {
    const raw = window.sessionStorage.getItem(STORAGE_KEY);
    if (!raw) return createFunnel(sessionId, now);
    const parsed = JSON.parse(raw) as Partial<FunnelState>;
    if (typeof parsed.sessionId !== "string" || typeof parsed.startedAt !== "number") return createFunnel(sessionId, now);
    return { sessionId: parsed.sessionId, startedAt: parsed.startedAt, reached: parsed.reached ?? {} };
  } catch {
    return createFunnel(sessionId, now);
  }
}

export function saveFunnel(state: FunnelState): void {
  if (typeof window === "undefined") return;
  try {
    window.sessionStorage.setItem(STORAGE_KEY, JSON.stringify(state));
  } catch {
    return;
  }
}
