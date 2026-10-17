import { describe, expect, it } from "vitest";
import { composeIllustration } from "../../graphics/application/compose.ts";
import { toSvg } from "../../graphics/renderers/svg/serialize.ts";
import { ART_HEIGHT, ART_WIDTH, templeArtInput } from "./templeArt.ts";

describe("templeArtInput", () => {
  it("is deterministic per art seed", () => {
    expect(templeArtInput(123)).toEqual(templeArtInput(123));
  });

  it("varies palette, complexity and projection across seeds", () => {
    const inputs = Array.from({ length: 40 }, (_, i) => templeArtInput(i * 7919 + 13));
    expect(new Set(inputs.map((i) => i.palette)).size).toBe(2);
    expect(new Set(inputs.map((i) => i.complexity)).size).toBeGreaterThan(3);
    expect(new Set(inputs.map((i) => i.tech?.projection?.kind)).size).toBe(2);
  });

  it("composes a portrait illustration that differs between seeds", () => {
    const svgs = new Set<string>();
    for (const seed of [11, 22, 33, 44, 55, 66]) {
      const ill = composeIllustration(templeArtInput(seed));
      expect(ill.width).toBe(ART_WIDTH);
      expect(ill.height).toBe(ART_HEIGHT);
      svgs.add(toSvg(ill.layers, ill.width, ill.height));
    }
    expect(svgs.size).toBe(6);
  });
});
