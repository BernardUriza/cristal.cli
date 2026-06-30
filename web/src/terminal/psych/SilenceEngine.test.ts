import { describe, expect, it } from "vitest";
import {
  advanceSilence,
  applySilencePolicy,
  createInitialSilenceState,
} from "./SilenceEngine";

describe("SilenceEngine", () => {
  it("does not silence emotional movement", () => {
    const first = advanceSilence(createInitialSilenceState(), {
      stance: "deflection",
      pressure: 0.3,
    });
    const moved = advanceSilence(first.state, {
      stance: "confession",
      pressure: 0.1,
    });

    expect(moved.state.stagnantTurns).toBe(0);
    expect(moved.policy.delayMs).toBe(0);
    expect(moved.policy.ellipsisOnly).toBe(false);
  });

  it("answers less when stance and pressure do not move", () => {
    let current = advanceSilence(createInitialSilenceState(), {
      stance: "intellectualization",
      pressure: 0.4,
    });
    current = advanceSilence(current.state, {
      stance: "intellectualization",
      pressure: 0.43,
    });

    expect(current.state.stagnantTurns).toBe(1);
    expect(current.policy.delayMs).toBeGreaterThan(0);
    expect(current.policy.maxLines).toBe(2);
  });

  it("eventually returns only ellipsis", () => {
    let current = advanceSilence(createInitialSilenceState(), {
      stance: "anesthesia",
      pressure: 0.5,
    });
    for (let i = 0; i < 4; i++) {
      current = advanceSilence(current.state, {
        stance: "anesthesia",
        pressure: 0.52,
      });
    }

    expect(current.policy.ellipsisOnly).toBe(true);
    expect(applySilencePolicy(["a", "b"], current.policy)).toEqual(["..."]);
  });

  it("trims empty framing before shortening replies", () => {
    const lines = applySilencePolicy(["", "first", "second", ""], {
      delayMs: 300,
      maxLines: 1,
      ellipsisOnly: false,
    });

    expect(lines).toEqual(["first"]);
  });
});
