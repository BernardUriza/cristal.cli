import type { Palette } from "../config/palettes.ts";
import type { ArtConfig } from "../config/types.ts";
import type { Lod } from "../domain/lod.ts";
import { inks, type Ink, type Ornament } from "../domain/motifs/ornament.ts";
import type { Vec2 } from "../domain/shapes.ts";
import type { View } from "./projection.ts";

export type Painter = { view: View; pal: Palette; art: ArtConfig; lod: Lod };

export function ornament(p: Painter, ink: Ink, sw: number, level = 1): Ornament {
  return { ink, sw, level, shows: p.lod.shows };
}

export function palInks(pal: Palette, a: string, b: string, c: string): Ink {
  return inks(pal.ink, a, b, c);
}

export function quad(a: Vec2, b: Vec2, c: Vec2, d: Vec2): Vec2[] {
  return [a, b, c, d];
}
