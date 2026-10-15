import { describe, expect, it } from "vitest";
import { DEFAULT_CONFIG, buildScene, renderFriedeberg } from "./friedebergSvg";
import { mulberry32 } from "./svgPrimitives";

describe("renderFriedeberg", () => {
  it("is deterministic per seed and differs across seeds", () => {
    const a = renderFriedeberg({ seed: 11 });
    const b = renderFriedeberg({ seed: 11 });
    const c = renderFriedeberg({ seed: 12 });
    expect(a.svg).toBe(b.svg);
    expect(a.svg).not.toBe(c.svg);
    expect(a.svg.startsWith("<svg")).toBe(true);
    expect(a.svg.endsWith("</svg>")).toBe(true);
  });

  it("builds a bilaterally symmetric colonnade with an odd column count", () => {
    for (const seed of [1, 2, 3, 4, 5]) {
      const scene = buildScene({ ...DEFAULT_CONFIG, seed }, mulberry32(seed));
      expect(scene.columns.length % 2).toBe(1);
      const sum = scene.columns.reduce((acc, c) => acc + c.x, 0);
      expect(Math.abs(sum)).toBeLessThan(1e-9);
      expect(scene.arches.length).toBe(scene.columns.length - 1);
    }
  });

  it("scales ornament with density", () => {
    const sparse = renderFriedeberg({ seed: 3, density: 0 }).svg.length;
    const dense = renderFriedeberg({ seed: 3, density: 1 }).svg.length;
    expect(dense).toBeGreaterThan(sparse);
  });
});
