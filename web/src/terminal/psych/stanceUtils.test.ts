import { describe, expect, it } from "vitest";
import { EVASIVE_STANCES, isEvasiveStance } from "./stanceUtils";

describe("stanceUtils", () => {
  it("keeps the evasive stance contract shared", () => {
    expect(EVASIVE_STANCES).toEqual([
      "intellectualization",
      "deflection",
      "anesthesia",
      "ritualization",
    ]);
    expect(isEvasiveStance("deflection")).toBe(true);
    expect(isEvasiveStance("confession")).toBe(false);
  });
});
