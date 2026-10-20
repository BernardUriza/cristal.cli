import { describe, expect, it } from "vitest";
import { hexToRgb, mixHex, rgbToHex } from "./color";

describe("color", () => {
  it("round-trips hex and mixes in byte space", () => {
    expect(hexToRgb("#2e6b55")).toEqual([46, 107, 85]);
    expect(rgbToHex([46, 107, 85])).toBe("#2e6b55");
    expect(mixHex("#000000", "#ffffff", 0.5)).toBe("#808080");
  });
});
