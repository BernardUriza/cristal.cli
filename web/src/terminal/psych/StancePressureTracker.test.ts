// @ts-ignore - Vitest is supplied by the test runner when these specs are run.
import { describe, expect, it } from "vitest";
import { StancePressureTracker } from "./StancePressureTracker";

describe("StancePressureTracker", () => {
  it("starts at zero pressure", () => {
    expect(new StancePressureTracker().state.pressure).toBe(0);
  });

  it("raises pressure as the player keeps evading", () => {
    const t = new StancePressureTracker();
    t.record("intellectualization");
    const first = t.state.pressure;
    t.record("intellectualization");
    t.record("intellectualization");
    expect(t.state.pressure).toBeGreaterThan(first);
  });

  it("flags the repeated evasion stance after two in a row", () => {
    const t = new StancePressureTracker();
    t.record("intellectualization");
    expect(t.state.repeatingStance).toBeNull();
    t.record("intellectualization");
    expect(t.state.repeatingStance).toBe("intellectualization");
    expect(t.state.consecutiveEvasion).toBe(2);
  });

  it("softens — confession relieves pressure and clears the streak", () => {
    const t = new StancePressureTracker();
    t.record("deflection");
    t.record("deflection");
    t.record("deflection");
    const high = t.state.pressure;
    t.record("confession");
    expect(t.state.pressure).toBeLessThan(high);
    expect(t.state.consecutiveEvasion).toBe(0);
    expect(t.state.repeatingStance).toBeNull();
  });

  it("clamps pressure to 0..1 under relentless evasion", () => {
    const t = new StancePressureTracker();
    for (let i = 0; i < 20; i++) t.record("anesthesia");
    expect(t.state.pressure).toBeLessThanOrEqual(1);
    expect(t.state.pressure).toBeGreaterThan(0);
  });

  it("keeps a bounded recent window", () => {
    const t = new StancePressureTracker();
    for (let i = 0; i < 12; i++) t.record("confession");
    expect(t.state.recent.length).toBeLessThanOrEqual(6);
  });

  it("does not flag repetition across different evasions", () => {
    const t = new StancePressureTracker();
    t.record("intellectualization");
    t.record("deflection");
    expect(t.state.repeatingStance).toBeNull();
  });
});
