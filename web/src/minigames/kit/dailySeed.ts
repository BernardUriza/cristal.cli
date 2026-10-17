import { fnv1a } from "../../shared/rng";

export const SEED_SPACE = 1_000_000;

export function isoDay(date: Date): string {
  return `${date.getFullYear()}-${String(date.getMonth() + 1).padStart(2, "0")}-${String(date.getDate()).padStart(2, "0")}`;
}

export function dailySeed(game: string, date: Date): number {
  return (fnv1a(`cristal-${game}-${isoDay(date)}`) % SEED_SPACE) + 1;
}

export function randomSeed(): number {
  return Math.floor(Math.random() * SEED_SPACE) + 1;
}
