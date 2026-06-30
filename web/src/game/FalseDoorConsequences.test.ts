import { describe, expect, it } from "vitest";
import { resolveFalseDoorConsequences } from "./FalseDoorConsequences";

describe("resolveFalseDoorConsequences", () => {
  it("marks a false door as deflection without declaring failure", () => {
    const consequence = resolveFalseDoorConsequences({
      roomSeed: 42,
      exitIndex: 1,
      pressureBefore: 0.2,
      priorFalseDoors: 0,
    });

    expect(consequence.pressureStance).toBe("deflection");
    expect(consequence.annotation.kind).toBe("false-door-avoidance");
    expect(consequence.annotation.text).toContain("false door 2");
    expect(consequence.whisper).not.toMatch(/lost|fail|dead|game over/i);
  });

  it("increases atmosphere spike gently for repeated avoidance", () => {
    const first = resolveFalseDoorConsequences({
      roomSeed: 7,
      exitIndex: 0,
      pressureBefore: 0.1,
      priorFalseDoors: 0,
    });
    const repeated = resolveFalseDoorConsequences({
      roomSeed: 7,
      exitIndex: 0,
      pressureBefore: 0.7,
      priorFalseDoors: 4,
    });

    expect(repeated.atmosphereSpike).toBeGreaterThan(first.atmosphereSpike);
    expect(repeated.atmosphereSpike).toBeLessThanOrEqual(0.22);
  });

  it("clamps invalid pressure", () => {
    const consequence = resolveFalseDoorConsequences({
      roomSeed: 1,
      exitIndex: 0,
      pressureBefore: Number.NaN,
      priorFalseDoors: 0,
    });

    expect(consequence.atmosphereSpike).toBeCloseTo(0.08);
  });
});
