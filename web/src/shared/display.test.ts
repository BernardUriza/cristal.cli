import { afterEach, describe, expect, it, vi } from "vitest";
import { deviceScale, MAX_DEVICE_SCALE } from "./display";

describe("deviceScale", () => {
  afterEach(() => vi.unstubAllGlobals());

  it("is 1 without a window", () => {
    expect(deviceScale()).toBe(1);
  });

  it("follows devicePixelRatio up to the cap", () => {
    vi.stubGlobal("window", { devicePixelRatio: 1.5 });
    expect(deviceScale()).toBe(1.5);
    vi.stubGlobal("window", { devicePixelRatio: 3 });
    expect(deviceScale()).toBe(MAX_DEVICE_SCALE);
    vi.stubGlobal("window", { devicePixelRatio: 0 });
    expect(deviceScale()).toBe(1);
  });
});
