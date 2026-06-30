export interface PressureEndingInput {
  pressure: number;
  inRoom: boolean;
  now: number;
}

export interface PressureEndingState {
  active: boolean;
  startedAt: number;
  durationMs: number;
  line: string;
  atmospherePressure: number;
}

export function resolvePressureEnding(input: PressureEndingInput): PressureEndingState | null {
  if (!input.inRoom || input.pressure < 1) return null;

  return {
    active: true,
    startedAt: input.now,
    durationMs: 2600,
    line: "Ya no hay nada que esquivar.",
    atmospherePressure: 0,
  };
}

export function pressureEndingComplete(
  ending: PressureEndingState | null,
  now: number
): boolean {
  return !!ending?.active && now - ending.startedAt >= ending.durationMs;
}
