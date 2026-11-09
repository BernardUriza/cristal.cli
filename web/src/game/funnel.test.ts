import { describe, expect, it } from "vitest";
import { createFunnel, funnelProgress, nextVerb, randomSessionId, reachFunnelStep } from "./funnel";

describe("funnel", () => {
  it("records each step once with seconds since the page loaded", () => {
    let state = createFunnel("abc", 1000);
    const first = reachFunnelStep(state, "pointer_lock", 4260);
    state = first.state;
    expect(first.seconds).toBe(3.3);
    const again = reachFunnelStep(state, "pointer_lock", 9000);
    expect(again.seconds).toBeNull();
    expect(again.state).toBe(state);
    expect(funnelProgress(state)).toBe(1);
  });

  it("asks only for walking: the keyboard alone steers, the mouse is optional", () => {
    let state = createFunnel("abc", 0);
    expect(nextVerb(state)).toBe("W A S D para caminar");
    state = reachFunnelStep(state, "first_step", 200).state;
    expect(nextVerb(state)).toBeNull();
  });

  it("makes a 12-char session id from the injected random source", () => {
    let i = 0;
    const id = randomSessionId(() => ((i += 7) % 36) / 36);
    expect(id).toMatch(/^[a-z0-9]{12}$/);
  });
});
