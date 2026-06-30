import { describe, expect, it } from "vitest";
import { generateGlyphSvg } from "./glyphSvg";
import type { SymbolicArchetype } from "./symbolicBus";

const ARCHETYPES: SymbolicArchetype[] = [
  "fragment",
  "echo",
  "corruption",
  "memory",
  "moon",
  "gate",
  "vision",
];

describe("generateGlyphSvg", () => {
  it("renders every symbolic archetype explicitly", () => {
    for (const archetype of ARCHETYPES) {
      const svg = generateGlyphSvg(archetype, "#39ff14", "#ffffff", 42);

      expect(svg).toContain("<svg");
      expect(svg).toContain("</svg>");
    }
  });
});
