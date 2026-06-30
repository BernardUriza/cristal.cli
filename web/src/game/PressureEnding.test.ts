import { describe, expect, it } from "vitest";
import { pressureEndingComplete, resolvePressureEnding } from "./PressureEnding";

describe("PressureEnding", () => {
  it("does not trigger outside a room", () => {
    expect(resolvePressureEnding({ pressure: 1, inRoom: false, now: 10 })).toBeNull();
  });

  it("starts surrender at full pressure", () => {
    const ending = resolvePressureEnding({ pressure: 1, inRoom: true, now: 25 });

    expect(ending?.line).toBe("Ya no hay nada que esquivar.");
    expect(ending?.atmospherePressure).toBe(0);
    expect(ending?.durationMs).toBeGreaterThan(1000);
  });

  it("is not complete until its short duration has elapsed", () => {
    const ending = resolvePressureEnding({ pressure: 1, inRoom: true, now: 100 });

    expect(pressureEndingComplete(ending, 1000)).toBe(false);
    expect(pressureEndingComplete(ending, 3000)).toBe(true);
  });
});
