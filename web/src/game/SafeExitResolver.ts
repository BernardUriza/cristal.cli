import type { Stance } from "../terminal/psych/StanceClassifier";
import { clamp01 } from "../shared/math";
import { seedForExit, type Room } from "./roomApi";

export interface SafeExit {
  index: number;
  label: string;
  seed: number;
  warmth: number;
  pulseScale: number;
  portalStability: number;
}

export interface SafeExitInput {
  stance: Stance | null;
  pressure: number;
  room: Pick<Room, "seed" | "exits" | "inscription">;
}

export function resolveSafeExit(input: SafeExitInput): SafeExit | null {
  if (input.stance !== "confession") return null;
  if (input.room.exits.length >= 4) return null;

  const pressure = clamp01(input.pressure);
  if (pressure > 0.72) return null;

  const openness = 1 - pressure;
  return {
    index: input.room.exits.length,
    label: "una puerta que no se aparta",
    seed: seedForExit(input.room.seed, input.room.exits.length + 17),
    warmth: 0.35 + openness * 0.45,
    pulseScale: 0.55 + pressure * 0.25,
    portalStability: 0.72 + openness * 0.24,
  };
}
