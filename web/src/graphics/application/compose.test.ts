import { describe, expect, it } from "vitest";
import { composeIllustration } from "./compose";
import { toSvg } from "../renderers/svg/serialize";

const svgOf = (input: Parameters<typeof composeIllustration>[0]) => {
  const ill = composeIllustration(input);
  return toSvg(ill.layers, ill.width, ill.height);
};

describe("composeIllustration", () => {
  it("is deterministic per seed and differs across seeds", () => {
    const a = svgOf({ seed: 11 });
    expect(a).toBe(svgOf({ seed: 11 }));
    expect(a).not.toBe(svgOf({ seed: 12 }));
    expect(a.startsWith("<svg")).toBe(true);
    expect(a.endsWith("</svg>")).toBe(true);
  });

  it("scales ornament with density and complexity", () => {
    const sparse = composeIllustration({ seed: 3, density: 0, complexity: 1 }).layers.length;
    const dense = composeIllustration({ seed: 3, density: 1, complexity: 5 }).layers.length;
    expect(dense).toBeGreaterThan(sparse);
  });

  it("lod detailScale prunes shapes without touching the architecture", () => {
    const fine = composeIllustration({ seed: 7, tech: { lod: { detailScale: 0.5 } } });
    const coarse = composeIllustration({ seed: 7, tech: { lod: { detailScale: 4 } } });
    expect(coarse.layers.length).toBeLessThan(fine.layers.length);
    expect(JSON.stringify(coarse.architecture)).toBe(JSON.stringify(fine.architecture));
  });

  it("elevation projection keeps the same architecture but another drawing", () => {
    const persp = composeIllustration({ seed: 7 });
    const elev = composeIllustration({ seed: 7, tech: { projection: { kind: "elevation" } } });
    expect(JSON.stringify(elev.architecture)).toBe(JSON.stringify(persp.architecture));
    expect(toSvg(elev.layers, 1200, 900)).not.toBe(toSvg(persp.layers, 1200, 900));
  });

  it("palette only changes colours, never geometry", () => {
    const day = svgOf({ seed: 5 });
    const night = svgOf({ seed: 5, palette: "noche" });
    const strip = (s: string) => s.replace(/#[0-9a-f]{6}/gi, "#");
    expect(strip(day)).toBe(strip(night));
    expect(day).not.toBe(night);
  });
});
