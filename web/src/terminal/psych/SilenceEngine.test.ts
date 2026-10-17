import { describe, expect, it } from "vitest";
import {
  advanceSilence,
  applySilencePolicy,
  createInitialSilenceState,
  type SilenceState,
} from "./SilenceEngine";

function stagnate(turns: number): { state: SilenceState; policies: ReturnType<typeof advanceSilence>["policy"][] } {
  let state = createInitialSilenceState();
  const policies = [];
  for (let i = 0; i < turns; i++) {
    const next = advanceSilence(state, { stance: "anesthesia", pressure: 0.5 });
    state = next.state;
    policies.push(next.policy);
  }
  return { state, policies };
}

describe("SilenceEngine", () => {
  it("does not silence emotional movement", () => {
    const first = advanceSilence(createInitialSilenceState(), { stance: "deflection", pressure: 0.3 });
    const moved = advanceSilence(first.state, { stance: "confession", pressure: 0.1 });

    expect(moved.state.stagnantTurns).toBe(0);
    expect(moved.policy.delayMs).toBe(0);
    expect(moved.policy.ellipsisOnly).toBe(false);
  });

  it("answers less when stance and pressure do not move", () => {
    let current = advanceSilence(createInitialSilenceState(), { stance: "intellectualization", pressure: 0.4 });
    current = advanceSilence(current.state, { stance: "intellectualization", pressure: 0.43 });

    expect(current.state.stagnantTurns).toBe(1);
    expect(current.policy.delayMs).toBeGreaterThan(0);
    expect(current.policy.maxLines).toBe(2);
  });

  it("ellipsis arrives with a nag, then the next stagnant turn pivots and the count restarts", () => {
    const { policies, state } = stagnate(6);
    expect(policies[4]).toMatchObject({ ellipsisOnly: true, companion: "nag" });
    expect(policies[5]).toMatchObject({ ellipsisOnly: false, companion: "pivot" });
    expect(state.stagnantTurns).toBe(0);
    expect(stagnate(7).policies[6].companion).toBe("none");
  });

  it("never returns the ellipsis alone when a companion is given", () => {
    const { policies } = stagnate(6);
    expect(applySilencePolicy(["a", "b"], policies[4], "sigo aquí")).toEqual(["...", "sigo aquí"]);
    expect(applySilencePolicy(["a", "b"], policies[5], "vamos a otro cuarto")).toEqual(["vamos a otro cuarto"]);
    expect(applySilencePolicy([], policies[2], "sigo aquí")).toEqual(["...", "sigo aquí"]);
  });

  it("trims empty framing before shortening replies", () => {
    const lines = applySilencePolicy(["", "first", "second", ""], {
      delayMs: 300,
      maxLines: 1,
      ellipsisOnly: false,
      companion: "none",
    });

    expect(lines).toEqual(["first"]);
  });
});
