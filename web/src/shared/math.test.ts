import { describe, expect, it } from "vitest";
import { clamp, clamp01, lerp, smoothstep } from "./math";

describe("clamp01", () => {
  it("normalizes finite and non-finite values into the pressure range", () => {
    expect(clamp01(-0.4)).toBe(0);
    expect(clamp01(0.45)).toBe(0.45);
    expect(clamp01(2)).toBe(1);
    expect(clamp01(Number.NaN)).toBe(0);
    expect(clamp01(Number.POSITIVE_INFINITY)).toBe(0);
  });
});

describe("clamp, lerp, smoothstep", () => {
  it("clamps into [lo, hi] and lets NaN through", () => {
    expect(clamp(-3, -2, 2)).toBe(-2);
    expect(clamp(1.5, -2, 2)).toBe(1.5);
    expect(clamp(140, 0, 100)).toBe(100);
    expect(clamp(Number.NaN, 0, 1)).toBeNaN();
  });

  it("interpolates linearly and eases between two edges", () => {
    expect(lerp(2, 6, 0.25)).toBe(3);
    expect(smoothstep(0, 1, -1)).toBe(0);
    expect(smoothstep(0, 1, 0.5)).toBe(0.5);
    expect(smoothstep(0.2, 0.6, 1)).toBe(1);
  });
});
