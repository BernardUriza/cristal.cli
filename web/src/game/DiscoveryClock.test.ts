import { describe, expect, it } from "vitest";
import {
  createDiscoveryState,
  isStarved,
  noteDiscovery,
  noteStarvationRelief,
  secondsSinceFind,
  STARVATION_MS,
} from "./DiscoveryClock";

describe("DiscoveryClock", () => {
  it("counts a find once per key and tracks the longest gap", () => {
    let state = createDiscoveryState(0);
    state = noteDiscovery(state, "node", "console_alpha", 10000);
    state = noteDiscovery(state, "node", "console_alpha", 20000);
    state = noteDiscovery(state, "inscription", "i1", 45000);
    expect(state.finds).toBe(2);
    expect(state.longestGapMs).toBe(35000);
    expect(secondsSinceFind(state, 48000)).toBe(3);
  });

  it("is starved after sixty seconds without a find, and relief resets the clock", () => {
    let state = createDiscoveryState(0);
    expect(isStarved(state, STARVATION_MS - 1)).toBe(false);
    expect(isStarved(state, STARVATION_MS)).toBe(true);
    state = noteStarvationRelief(state, STARVATION_MS);
    expect(isStarved(state, STARVATION_MS + 1000)).toBe(false);
    expect(state.starvations).toBe(1);
    expect(state.finds).toBe(1);
  });
});
