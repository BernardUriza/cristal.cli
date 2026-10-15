import type { SymbolicArchetype } from "./symbolicBus";
import { concentricCircles, flowerOfLife, glitchPattern, mulberry32, polygon, radialLines } from "./svgPrimitives";

const SIZE = 256;
const C = SIZE / 2;

function core(color: string) {
  return `<circle cx="${C}" cy="${C}" r="30" fill="${color}" opacity="0.18" filter="url(#glow)"/>`;
}

function assertNever(value: never): never {
  throw new Error(`Unhandled glyph archetype: ${value}`);
}

function body(archetype: SymbolicArchetype, color: string, accent: string, rng: () => number): string {
  switch (archetype) {
    case "vision":
      return (
        core(color) +
        flowerOfLife(C, C, 96, 3, color, 3.0) +
        polygon(C, C, 110, 3, accent, 3.4)
      );
    case "memory":
      return (
        core(color) +
        flowerOfLife(C, C, 96, 3, color, 3.0) +
        polygon(C, C, 110, 3, accent, 3.4)
      );
    case "corruption":
      return (
        glitchPattern(C, C, 100, rng, color, accent, 6, 1.2) +
        polygon(C, C, 110, 4, color, 3.6, Math.PI / 4) +
        polygon(C, C, 78, 4, accent, 2.6)
      );
    case "fragment":
      return (
        core(color) +
        polygon(C, C, 104, 5, color, 3.4, Math.PI / 5) +
        polygon(C - 10, C + 8, 64, 3, accent, 2.7, rng() * Math.PI) +
        glitchPattern(C, C, 92, rng, color, accent, 2, 0.45)
      );
    case "gate":
      return (
        core(color) +
        concentricCircles(C, C, 108, 4, color, 3.4) +
        polygon(C, C, 96, 4, accent, 3.5, Math.PI / 4) +
        polygon(C, C, 62, 4, color, 2.4, Math.PI / 4)
      );
    case "moon":
      return (
        core(color) +
        concentricCircles(C, C, 100, 5, color, 3.2) +
        polygon(C, C, 72, 6, accent, 3.2)
      );
    case "echo":
      return (
        core(color) +
        concentricCircles(C, C, 100, 5, color, 3.2) +
        radialLines(C, C, 100, 12, color, 2.0) +
        polygon(C, C, 72, 6, accent, 3.2)
      );
    default:
      return assertNever(archetype);
  }
}

export function generateGlyphSvg(archetype: SymbolicArchetype, color: string, accent = "#ffffff", seed = 1337): string {
  const rng = mulberry32(seed + archetype.length * 131);
  return `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 ${SIZE} ${SIZE}" width="${SIZE}" height="${SIZE}">
<defs>
<filter id="glow" x="-60%" y="-60%" width="220%" height="220%">
<feGaussianBlur stdDeviation="3.0" result="b"/>
<feMerge><feMergeNode in="b"/><feMergeNode in="b"/><feMergeNode in="SourceGraphic"/></feMerge>
</filter>
<radialGradient id="bg"><stop offset="0%" stop-color="${color}" stop-opacity="0.10"/><stop offset="100%" stop-color="#000" stop-opacity="0"/></radialGradient>
</defs>
<circle cx="${C}" cy="${C}" r="118" fill="${color}" opacity="0.20" filter="url(#glow)"/>
<circle cx="${C}" cy="${C}" r="118" fill="none" stroke="${color}" stroke-width="4" opacity="0.92" filter="url(#glow)"/>
${body(archetype, color, accent, rng)}
</svg>`;
}

export function glyphSvgDataUri(archetype: SymbolicArchetype, color: string, accent = "#ffffff", seed = 1337): string {
  const svg = generateGlyphSvg(archetype, color, accent, seed);
  return `data:image/svg+xml;charset=utf-8,${encodeURIComponent(svg)}`;
}
