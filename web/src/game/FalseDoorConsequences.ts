import { clamp01 } from "../shared/math";

export interface FalseDoorEvent {
  roomSeed: number;
  exitIndex: number;
  pressureBefore: number;
  priorFalseDoors: number;
}

export interface FalseDoorAnnotation {
  kind: "false-door-avoidance";
  roomSeed: number;
  exitIndex: number;
  text: string;
  timestamp: number;
}

export interface FalseDoorConsequence {
  pressureStance: "deflection";
  atmosphereSpike: number;
  annotation: Omit<FalseDoorAnnotation, "timestamp">;
  whisper: string | null;
}

export function resolveFalseDoorConsequences(
  event: FalseDoorEvent
): FalseDoorConsequence {
  const pressure = clamp01(event.pressureBefore);
  const repeats = Math.max(0, event.priorFalseDoors);
  const atmosphereSpike = Math.min(0.22, 0.08 + repeats * 0.025 + pressure * 0.04);
  const whisper =
    repeats === 0
      ? "Una salida que no pedía verdad."
      : repeats < 3
      ? "Otra forma de irte sin moverte."
      : "El cuarto ya conoce ese rodeo.";

  return {
    pressureStance: "deflection",
    atmosphereSpike,
    annotation: {
      kind: "false-door-avoidance",
      roomSeed: event.roomSeed,
      exitIndex: event.exitIndex,
      text: `avoidance: false door ${event.exitIndex + 1}`,
    },
    whisper,
  };
}
