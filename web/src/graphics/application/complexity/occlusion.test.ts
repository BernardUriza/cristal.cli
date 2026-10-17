import { describe, expect, it } from "vitest";
import { occlusionBattery, scenePainter } from "./index.ts";

describe("occlusion battery", () => {
  it("every figure overlaps something on screen, so the check has something to find", () => {
    for (const r of occlusionBattery()) expect(r.overlappingPairs, r.name).toBeGreaterThanOrEqual(r.figures);
  });

  it("the scene's painter leaves zero figures without coherent occlusion", () => {
    expect(occlusionBattery().map((r) => [r.name, r.violations])).toEqual([
      ["figura detrás de torre", 0],
      ["figura delante de torre", 0],
      ["figura dentro de patio cerrado", 0],
      ["puentes cruzados", 0],
    ]);
  });

  it("a painter that paints back to front in reverse is caught in every case", () => {
    const reversed = occlusionBattery((items, forward) => [...scenePainter(items, forward)].reverse());
    for (const r of reversed) expect(r.violations, r.name).toBeGreaterThan(0);
  });

  it("holds from another azimuth too", () => {
    expect(occlusionBattery(scenePainter, 0.48).every((r) => r.violations === 0)).toBe(true);
  });
});
