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

  it("builds a bilaterally symmetric main colonnade with an odd column count and two wings", () => {
    for (const seed of [1, 2, 3, 4, 5]) {
      const scene = buildScene({ ...DEFAULT_CONFIG, seed }, mulberry32(seed));
      expect(scene.main.columns.length % 2).toBe(1);
      const sum = scene.main.columns.reduce((acc, c) => acc + c.x, 0);
      expect(Math.abs(sum)).toBeLessThan(1e-9);
      expect(scene.main.arches.length).toBe(scene.main.columns.length - 1);
      expect(scene.wings.length).toBe(2);
      expect(scene.wings[0].z).toBeGreaterThan(scene.main.z);
    }
  });

  it("introduces anomalies only when the rate allows", () => {
    const none = buildScene({ ...DEFAULT_CONFIG, seed: 9, anomalyRate: 0 }, mulberry32(9));
    expect(none.main.columns.some((c) => c.twisted)).toBe(false);
    expect(none.main.arches.some((a) => a.pointed)).toBe(false);
    const all = buildScene({ ...DEFAULT_CONFIG, seed: 9, anomalyRate: 1 }, mulberry32(9));
    expect(all.main.columns.filter((c) => c.twisted).length).toBe(1);
    expect(all.main.arches.filter((a) => a.pointed).length).toBe(1);
  });

  it("scales ornament with density and complexity", () => {
    const sparse = renderFriedeberg({ seed: 3, density: 0, complexity: 1 }).svg.length;
    const dense = renderFriedeberg({ seed: 3, density: 1, complexity: 5 }).svg.length;
    expect(dense).toBeGreaterThan(sparse);
  });
});
