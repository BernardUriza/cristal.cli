import { describe, expect, it } from "vitest";
import { clamp01 } from "./math";

describe("clamp01", () => {
  it("normalizes finite and non-finite values into the pressure range", () => {
    expect(clamp01(-0.4)).toBe(0);
    expect(clamp01(0.45)).toBe(0.45);
    expect(clamp01(2)).toBe(1);
    expect(clamp01(Number.NaN)).toBe(0);
    expect(clamp01(Number.POSITIVE_INFINITY)).toBe(0);
  });
});
