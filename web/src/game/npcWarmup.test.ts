import { describe, expect, it } from "vitest";
import { npcSessionId } from "./npcWarmup";

describe("npcSessionId", () => {
  it("gives each inhabitant their own thread inside the player's session", () => {
    expect(npcSessionId("FRACTURE_00", "npc_velador")).toBe("FRACTURE_00-npc_velador");
    expect(npcSessionId("FRACTURE_00", "npc_velador")).toMatch(/^[A-Za-z0-9_-]+$/);
  });
});
