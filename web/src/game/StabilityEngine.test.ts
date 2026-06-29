// @ts-ignore - Vitest is supplied by the test runner when these specs are run.
import { describe, expect, it } from "vitest";
import { StabilityEngine } from "./StabilityEngine";

describe("StabilityEngine", () => {
  it("decays stability over time", () => {
    const engine = new StabilityEngine();

    engine.tick(5);

    expect(engine.state.stability).toBe(95);
    expect(engine.state.elapsed).toBe(5);
  });

  it("decays faster as dread rises", () => {
    const calm = new StabilityEngine({ dread: 0 });
    const afraid = new StabilityEngine({ dread: 100 });

    calm.tick(10);
    afraid.tick(10);

    expect(afraid.state.stability).toBeLessThan(calm.state.stability);
    expect(calm.state.stability).toBe(90);
    expect(afraid.state.stability).toBe(70);
  });

  it("applies a sharp false-door penalty", () => {
    const engine = new StabilityEngine();

    engine.falseDoorPenalty();

    expect(engine.state.stability).toBe(55);
  });

  it("applies a small safe-door recovery", () => {
    const engine = new StabilityEngine({ stability: 40 });

    engine.safeDoorReward();

    expect(engine.state.stability).toBe(50);
  });

  it("clamps stability and dread between 0 and 100", () => {
    const engine = new StabilityEngine({ stability: 150, dread: -20 });

    expect(engine.state.stability).toBe(100);
    expect(engine.state.dread).toBe(0);

    engine.setDread(140);
    engine.tick(100);
    engine.safeDoorReward();
    engine.safeDoorReward();

    expect(engine.state.dread).toBe(100);
    expect(engine.state.stability).toBe(20);

    engine.falseDoorPenalty();

    expect(engine.state.stability).toBe(0);
  });

  it("reports eviction at zero stability", () => {
    const engine = new StabilityEngine({ stability: 1 });

    engine.tick(1);

    expect(engine.state.stability).toBe(0);
    expect(engine.isEvicted).toBe(true);
  });

  it("round-trips through serialize and deserialize", () => {
    const engine = new StabilityEngine({ stability: 82, dread: 35 });
    engine.tick(4.5);
    engine.falseDoorPenalty();
    engine.safeDoorReward();

    const serialized = engine.serialize();
    const restored = StabilityEngine.deserialize(serialized);

    expect(restored.serialize()).toBe(serialized);
    expect(restored.state).toEqual(engine.state);
    expect(restored.isEvicted).toBe(engine.isEvicted);
  });
});
