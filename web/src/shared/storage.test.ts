import { afterEach, describe, expect, it, vi } from "vitest";
import { flagStore, readJson, readText, writeJson } from "./storage";

function fakeStorage(): Storage {
  const values = new Map<string, string>();
  return {
    get length() {
      return values.size;
    },
    clear: () => values.clear(),
    key: (i) => [...values.keys()][i] ?? null,
    getItem: (k) => values.get(k) ?? null,
    setItem: (k, v) => void values.set(k, v),
    removeItem: (k) => void values.delete(k),
  };
}

afterEach(() => vi.unstubAllGlobals());

describe("shared storage", () => {
  it("reads nothing and throws nothing without a window", () => {
    expect(readJson("k")).toBeNull();
    expect(flagStore("k", true).load()).toBe(true);
  });

  it("round-trips json per area and drops corrupt json", () => {
    vi.stubGlobal("window", { localStorage: fakeStorage(), sessionStorage: fakeStorage() });
    writeJson("k", { a: 1 });
    writeJson("k", { b: 2 }, "session");
    expect(readJson("k")).toEqual({ a: 1 });
    expect(readJson("k", "session")).toEqual({ b: 2 });
    window.localStorage.setItem("bad", "{nope");
    expect(readJson("bad")).toBeNull();
  });

  it("survives a storage that throws on access", () => {
    vi.stubGlobal("window", {
      get localStorage(): Storage {
        throw new Error("SecurityError");
      },
    });
    expect(readText("k")).toBeNull();
    expect(() => writeJson("k", 1)).not.toThrow();
  });

  it("keeps a flag's fallback until it is saved", () => {
    vi.stubGlobal("window", { localStorage: fakeStorage() });
    const flag = flagStore("sound", true);
    expect(flag.load()).toBe(true);
    flag.save(false);
    expect(flag.load()).toBe(false);
    expect(window.localStorage.getItem("sound")).toBe("off");
  });
});
