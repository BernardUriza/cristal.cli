import type { SymbolicArchetype } from "../../game/symbolicBus";
import { inks } from "../domain/motifs/ornament.ts";
import { concentricRings, radialLines } from "../domain/motifs/radial.ts";
import { flowerOfLife, glitchPattern, outlinedPolygon } from "../domain/motifs/sigils.ts";
import { mulberry32, type Rng } from "../../shared/rng";
import { circle, stroked, type DisplayList, type Shape } from "../domain/shapes.ts";

export const GLYPH_SIZE = 256;
const C = GLYPH_SIZE / 2;

function core(color: string): Shape {
  return circle(C, C, 30, { fill: color, opacity: 0.18, glow: true });
}

function rings(color: string, maxR: number, count: number, sw: number): Shape[] {
  return concentricRings(C, C, maxR, count, { ink: inks(color, color, color, color), sw, level: 1, shows: () => true }, true);
}

function rays(color: string, r: number, count: number, sw: number): Shape[] {
  return radialLines(C, C, r, count, { ink: inks(color, color, color, color), sw, level: 1, shows: () => true }, 0, 2 * Math.PI, true);
}

function assertNever(value: never): never {
  throw new Error(`Unhandled glyph archetype: ${value}`);
}

function body(archetype: SymbolicArchetype, color: string, accent: string, rng: Rng): Shape[] {
  switch (archetype) {
    case "vision":
    case "memory":
      return [core(color), ...flowerOfLife(C, C, 96, 3, color, 3.0), outlinedPolygon(C, C, 110, 3, accent, 3.4)];
    case "corruption":
      return [...glitchPattern(C, C, 100, rng, color, accent, 6, 1.2), outlinedPolygon(C, C, 110, 4, color, 3.6, Math.PI / 4), outlinedPolygon(C, C, 78, 4, accent, 2.6)];
    case "fragment":
      return [core(color), outlinedPolygon(C, C, 104, 5, color, 3.4, Math.PI / 5), outlinedPolygon(C - 10, C + 8, 64, 3, accent, 2.7, rng() * Math.PI), ...glitchPattern(C, C, 92, rng, color, accent, 2, 0.45)];
    case "gate":
      return [core(color), ...rings(color, 108, 4, 3.4), outlinedPolygon(C, C, 96, 4, accent, 3.5, Math.PI / 4), outlinedPolygon(C, C, 62, 4, color, 2.4, Math.PI / 4)];
    case "moon":
      return [core(color), ...rings(color, 100, 5, 3.2), outlinedPolygon(C, C, 72, 6, accent, 3.2)];
    case "echo":
      return [core(color), ...rings(color, 100, 5, 3.2), ...rays(color, 100, 12, 2.0), outlinedPolygon(C, C, 72, 6, accent, 3.2)];
    default:
      return assertNever(archetype);
  }
}

export function composeGlyph(archetype: SymbolicArchetype, color: string, accent = "#ffffff", seed = 1337): DisplayList {
  const rng = mulberry32(seed + archetype.length * 131);
  return [
    circle(C, C, 118, { fill: color, opacity: 0.2, glow: true }),
    circle(C, C, 118, stroked(color, 4, { opacity: 0.92, glow: true })),
    ...body(archetype, color, accent, rng),
  ];
}
