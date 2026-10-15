import type { SymbolicArchetype } from "../../../game/symbolicBus";
import { composeGlyph, GLYPH_SIZE } from "../../application/glyph.ts";
import { svgDataUri, toSvg } from "./serialize.ts";

export function generateGlyphSvg(archetype: SymbolicArchetype, color: string, accent = "#ffffff", seed = 1337): string {
  return toSvg(composeGlyph(archetype, color, accent, seed), GLYPH_SIZE, GLYPH_SIZE);
}

export function glyphSvgDataUri(archetype: SymbolicArchetype, color: string, accent = "#ffffff", seed = 1337): string {
  return svgDataUri(generateGlyphSvg(archetype, color, accent, seed));
}
