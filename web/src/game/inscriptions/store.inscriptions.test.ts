import { afterEach, beforeEach, describe, expect, it } from "vitest";
import { useGame } from "../store";
import { STARVATION_MS } from "../DiscoveryClock";

const ALPHA = { x: 3, y: 2 };

describe("store: inscriptions and discovery", () => {
  beforeEach(() => useGame.setState({ ...useGame.getInitialState(), inscriptions: [], discovery: { lastFindAt: 0, finds: 0, longestGapMs: 0, starvations: 0, seenKeys: [] } }, true));
  afterEach(() => useGame.setState(useGame.getInitialState(), true));

  it("writes a console phrase on a wall of the console's cell and counts it as a find", () => {
    useGame.getState().addInscription("me siento cansado y confundido", "confession", ALPHA, "#33ff99", 1000);
    const [first] = useGame.getState().inscriptions;
    expect(first.cell).toEqual(ALPHA);
    expect(first.text).toBe("me siento cansado y confund…");
    expect(first.source).toBe("console");
    expect(useGame.getState().discovery.finds).toBe(1);
    expect(useGame.getState().discovery.lastFindAt).toBe(1000);
  });

  it("after a minute without a find, writes a deformed fragment of the player's words ahead of them", () => {
    useGame.getState().addInscription("me siento cansado y confundido", "confession", ALPHA, "#33ff99", 1000);
    useGame.getState().relieveStarvation({ x: 4, y: 4 }, 1000 + STARVATION_MS - 1);
    expect(useGame.getState().inscriptions).toHaveLength(1);

    useGame.getState().relieveStarvation({ x: 4, y: 4 }, 1000 + STARVATION_MS);
    const items = useGame.getState().inscriptions;
    expect(items).toHaveLength(2);
    expect(items[1].source).toBe("starvation");
    expect(items[1].text).toContain("…");
    expect(items[1].cell).not.toEqual({ x: 4, y: 4 });
    expect(useGame.getState().discovery.starvations).toBe(1);

    useGame.getState().relieveStarvation({ x: 4, y: 4 }, 1000 + STARVATION_MS + 5000);
    expect(useGame.getState().inscriptions).toHaveLength(2);
  });

  it("dedupes discoveries by key without re-rendering the store", () => {
    const before = useGame.getState();
    useGame.getState().noteDiscovery("node", "console_alpha", 500);
    const after = useGame.getState();
    expect(after.discovery.finds).toBe(1);
    useGame.getState().noteDiscovery("node", "console_alpha", 900);
    expect(useGame.getState()).toBe(after);
    expect(before).not.toBe(after);
  });
});
