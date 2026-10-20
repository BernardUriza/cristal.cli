import { describe, expect, it } from "vitest";
import type { SymbolicArchetype } from "../../../shared/archetype";
import { generateGlyphSvg, glyphSvgDataUri } from "./glyph";

const ARCHETYPES: SymbolicArchetype[] = ["fragment", "echo", "corruption", "memory", "moon", "gate", "vision"];

describe("generateGlyphSvg", () => {
  it("renders every symbolic archetype explicitly, deterministically, with glow defs", () => {
    for (const archetype of ARCHETYPES) {
      const svg = generateGlyphSvg(archetype, "#39ff14", "#ffffff", 42);
      expect(svg.startsWith("<svg")).toBe(true);
      expect(svg).toContain('<filter id="glow"');
      expect(svg).toBe(generateGlyphSvg(archetype, "#39ff14", "#ffffff", 42));
    }
    expect(glyphSvgDataUri("moon", "#39ff14").startsWith("data:image/svg+xml;charset=utf-8,")).toBe(true);
  });
});
