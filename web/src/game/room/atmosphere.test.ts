import { describe, expect, it } from "vitest";
import { MIN_AMBIENT, atmosphere, dreadFraction, hexToLinearRgb, lerpRgb } from "./atmosphere";

describe("atmosphere", () => {
  it("more dread means less light, closer fog and a redder tint", () => {
    const calm = atmosphere(0);
    const mid = atmosphere(50);
    const terror = atmosphere(100);
    expect(mid.ambient).toBeLessThan(calm.ambient);
    expect(terror.ambient).toBeLessThan(mid.ambient);
    expect(mid.fogNear).toBeLessThan(calm.fogNear);
    expect(terror.fogFar).toBeLessThan(mid.fogFar);
    expect(terror.fogColor.r).toBeGreaterThan(calm.fogColor.r);
    expect(terror.fogColor.g).toBeLessThan(calm.fogColor.g);
    expect(terror.wallColor.r).toBeGreaterThan(calm.wallColor.r);
  });

  it("clamps dread to 0..100 and keeps a floor of ambient light", () => {
    expect(atmosphere(-40)).toEqual(atmosphere(0));
    expect(atmosphere(400)).toEqual(atmosphere(100));
    expect(dreadFraction(250)).toBe(1);
    expect(dreadFraction(-5)).toBe(0);
    expect(atmosphere(100, 0, 0, 1).ambient).toBeCloseTo(MIN_AMBIENT, 9);
  });

  it("lighting bias brightens, fog bias pulls the fog in", () => {
    expect(atmosphere(30, 0.9).ambient).toBeGreaterThan(atmosphere(30, 0.1).ambient);
    expect(atmosphere(30, 0.42, 1).fogNear).toBeLessThan(atmosphere(30, 0.42, 0).fogNear);
    expect(atmosphere(30, 0.42, 1).fogFar).toBeLessThan(atmosphere(30, 0.42, 0).fogFar);
  });

  it("converts hex to linear rgb and lerps componentwise", () => {
    expect(hexToLinearRgb("#000000")).toEqual({ r: 0, g: 0, b: 0 });
    expect(hexToLinearRgb("#ffffff").r).toBeCloseTo(1, 6);
    const half = lerpRgb({ r: 0, g: 0, b: 0 }, { r: 1, g: 2, b: 4 }, 0.5);
    expect(half).toEqual({ r: 0.5, g: 1, b: 2 });
  });
});
