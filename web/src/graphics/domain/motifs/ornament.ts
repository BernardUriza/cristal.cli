import type { Lod } from "../lod.ts";

export type Ink = { ink: string; a: string; b: string; c: string };

export type Ornament = { ink: Ink; sw: number; level: number; shows: Lod["shows"] };

export function inks(ink: string, a: string, b: string, c: string): Ink {
  return { ink, a, b, c };
}

export function withLevel(o: Ornament, level: number): Ornament {
  return { ...o, level };
}

export function withStroke(o: Ornament, sw: number): Ornament {
  return { ...o, sw };
}
