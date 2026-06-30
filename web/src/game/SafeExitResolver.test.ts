import { describe, expect, it } from "vitest";
import { resolveSafeExit } from "./SafeExitResolver";

const room = {
  seed: 123,
  exits: ["one", "two"],
  inscription: "di la parte que dejaste afuera",
};

describe("resolveSafeExit", () => {
  it("does not open from avoidance", () => {
    expect(
      resolveSafeExit({ stance: "deflection", pressure: 0.2, room })
    ).toBeNull();
  });

  it("opens one additional exit from confession at navigable pressure", () => {
    const safe = resolveSafeExit({ stance: "confession", pressure: 0.24, room });

    expect(safe).not.toBeNull();
    expect(safe?.index).toBe(room.exits.length);
    expect(safe?.warmth).toBeGreaterThan(0.6);
    expect(safe?.portalStability).toBeGreaterThan(0.9);
  });

  it("withholds the exit when pressure is still too high", () => {
    expect(
      resolveSafeExit({ stance: "confession", pressure: 0.9, room })
    ).toBeNull();
  });

  it("does not exceed the room door budget", () => {
    expect(
      resolveSafeExit({
        stance: "confession",
        pressure: 0.1,
        room: { ...room, exits: ["a", "b", "c", "d"] },
      })
    ).toBeNull();
  });
});
