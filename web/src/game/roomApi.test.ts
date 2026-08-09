import { afterEach, describe, expect, it, vi } from "vitest";
import { generateRoom, localRoom } from "./roomApi";

function responseWithJson(payload: unknown): Response {
  return {
    ok: true,
    json: async () => payload,
    text: async () => "",
  } as Response;
}

const PARAMS: Parameters<typeof generateRoom>[0] = {
  seed: 42,
  archetype: "moon",
  depth: 2,
  fragments: ["confesion a medias"],
};

describe("generateRoom", () => {
  afterEach(() => {
    vi.unstubAllGlobals();
    vi.useRealTimers();
  });

  it("uses the server response when the request succeeds", async () => {
    const serverRoom = {
      name: "Camara Lunar",
      inscription: "la marea te nombra",
      description: "un cuarto que el servidor invento",
      exits: ["norte", "sur"],
      dread: 55,
      shape: "chamber",
      seed: 42,
    };
    const fetchMock = vi.fn(async () => responseWithJson(serverRoom));
    vi.stubGlobal("fetch", fetchMock);

    await expect(generateRoom({ ...PARAMS })).resolves.toEqual(serverRoom);
    expect(fetchMock).toHaveBeenCalledOnce();
  });

  it("falls back to a local room when fetch rejects", async () => {
    vi.stubGlobal(
      "fetch",
      vi.fn(async () => {
        throw new TypeError("Failed to fetch");
      }),
    );

    const room = await generateRoom({ ...PARAMS });
    expect(room).toEqual(localRoom({ ...PARAMS }));
    expect(room.description).toContain("Fallback local");
  });

  it("falls back to a local room when the server hangs past the timeout", async () => {
    vi.useFakeTimers();
    const fetchMock = vi.fn(
      (..._args: Parameters<typeof fetch>) => new Promise<Response>(() => {}),
    );
    vi.stubGlobal("fetch", fetchMock);

    const pending = generateRoom({ ...PARAMS, timeoutMs: 1000 });
    await vi.advanceTimersByTimeAsync(1000);

    const room = await pending;
    expect(room).toEqual(localRoom({ ...PARAMS }));
    expect(fetchMock.mock.calls[0]?.[1]?.signal?.aborted).toBe(true);
  });

  it("does not fall back before the timeout elapses", async () => {
    vi.useFakeTimers();
    const serverRoom = {
      name: "Camara Lenta",
      inscription: "",
      description: "el servidor tardó pero llegó",
      exits: ["norte"],
      dread: 10,
      shape: "chamber",
      seed: 42,
    };
    vi.stubGlobal(
      "fetch",
      vi.fn(
        () =>
          new Promise<Response>((resolve) => {
            setTimeout(() => resolve(responseWithJson(serverRoom)), 500);
          }),
      ),
    );

    const pending = generateRoom({ ...PARAMS, timeoutMs: 1000 });
    await vi.advanceTimersByTimeAsync(500);

    await expect(pending).resolves.toEqual(serverRoom);
  });

  it("falls back to a local room when the server responds with an error", async () => {
    vi.stubGlobal(
      "fetch",
      vi.fn(async () =>
        ({ ok: false, status: 500, json: async () => ({}), text: async () => "boom" }) as Response,
      ),
    );

    const room = await generateRoom({ ...PARAMS });
    expect(room).toEqual(localRoom({ ...PARAMS }));
  });

  it("produces a deterministic fallback for the same seed/archetype/depth/fragments", async () => {
    vi.stubGlobal(
      "fetch",
      vi.fn(async () => {
        throw new TypeError("Failed to fetch");
      }),
    );

    const first = await generateRoom({ ...PARAMS });
    const second = await generateRoom({ ...PARAMS });
    expect(second).toEqual(first);

    const otherSeed = await generateRoom({ ...PARAMS, seed: 43 });
    expect(otherSeed.seed).toBe(43);
    expect(otherSeed.name).not.toBe(first.name);
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
