import type { Stance } from "./StanceClassifier";

export const EVASIVE_STANCES = [
  "intellectualization",
  "deflection",
  "anesthesia",
  "ritualization",
] as const satisfies readonly Stance[];

export function isEvasiveStance(stance: Stance): boolean {
  return (EVASIVE_STANCES as readonly Stance[]).includes(stance);
}
