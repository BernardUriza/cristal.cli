import { afterEach, describe, expect, it, vi } from "vitest";
import { generateRoom } from "./roomApi";

function responseWithJson(payload: unknown): Response {
  return {
    ok: true,
    json: async () => payload,
    text: async () => "",
  } as Response;
}

describe("generateRoom", () => {
  afterEach(() => {
    vi.unstubAllGlobals();
  });

  it("coerces malformed server rooms and preserves a valid negative-seed fallback shape", async () => {
    vi.stubGlobal(
      "fetch",
      vi.fn(async () =>
        responseWithJson({
          name: 101,
          inscription: false,
          description: ["broken"],
          exits: ["north", 4, null, "east"],
          dread: Number.NaN,
          shape: "spiral",
        }),
      ),
    );

    await expect(
      generateRoom({ seed: -1, archetype: "echo", depth: 3, fragments: ["glass"] }),
    ).resolves.toEqual({
      name: "Room 1",
      inscription: "",
      description: "",
      exits: ["north", "east"],
      dread: 0,
      shape: "corridor",
      seed: -1,
    });
  });
});
