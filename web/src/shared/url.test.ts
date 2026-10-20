import { afterEach, describe, expect, it, vi } from "vitest";
import { flagParam, numberParam, positiveIntParam, searchParams, stringParam } from "./url";

describe("url params", () => {
  afterEach(() => vi.unstubAllGlobals());

  it("reads an empty search when there is no window", () => {
    expect(searchParams().toString()).toBe("");
    expect(stringParam("view")).toBeNull();
    expect(flagParam("viaje")).toBeNull();
  });

  it("reads window.location.search by default", () => {
    vi.stubGlobal("window", { location: { search: "?view=graphics&seed=7" } });
    expect(stringParam("view")).toBe("graphics");
    expect(positiveIntParam("seed")).toBe(7);
  });

  it("returns the raw string, empty included", () => {
    expect(stringParam("n", "?n=")).toBe("");
    expect(stringParam("n", "?seed=1")).toBeNull();
  });

  it("treats only 0, off and false as an off flag", () => {
    expect(flagParam("viaje", "?viaje=1")).toBe(true);
    expect(flagParam("viaje", "?viaje=")).toBe(true);
    expect(flagParam("viaje", "?viaje=yes")).toBe(true);
    expect(flagParam("viaje", "?viaje=0")).toBe(false);
    expect(flagParam("viaje", "?viaje=off")).toBe(false);
    expect(flagParam("viaje", "?viaje=false")).toBe(false);
    expect(flagParam("viaje", "?seed=3")).toBeNull();
  });

  it("parses numbers without hiding NaN", () => {
    expect(numberParam("density", "?density=0.4")).toBe(0.4);
    expect(numberParam("density", "?density=")).toBe(0);
    expect(numberParam("density", "?density=abc")).toBeNaN();
    expect(numberParam("density", "?seed=1")).toBeNull();
  });

  it("accepts only positive finite integers, floored", () => {
    expect(positiveIntParam("seed", "?seed=12.9")).toBe(12);
    expect(positiveIntParam("seed", "?seed=0")).toBeNull();
    expect(positiveIntParam("seed", "?seed=-3")).toBeNull();
    expect(positiveIntParam("seed", "?seed=abc")).toBeNull();
    expect(positiveIntParam("seed", "?seed=Infinity")).toBeNull();
    expect(positiveIntParam("seed", "")).toBeNull();
  });
});
