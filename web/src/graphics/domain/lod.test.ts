import { describe, expect, it } from "vitest";
import { lodLevel, makeLod, visible } from "./lod";

describe("lod", () => {
  it("gates detail by projected size", () => {
    expect(visible(5)).toBe(true);
    expect(visible(4.9)).toBe(false);
    expect(visible(9, 10)).toBe(false);
  });

  it("detailScale moves every threshold together", () => {
    const strict = makeLod({ detailScale: 2 });
    const loose = makeLod({ detailScale: 0.5 });
    expect(strict.shows(9, 5)).toBe(false);
    expect(loose.shows(3, 5)).toBe(true);
    expect(makeLod({ detailScale: 0 }).shows(0)).toBe(true);
  });

  it("maps projected size to discrete levels", () => {
    const t = [8, 32, 128];
    expect(lodLevel(4, t)).toBe(0);
    expect(lodLevel(8, t)).toBe(1);
    expect(lodLevel(64, t)).toBe(2);
    expect(lodLevel(999, t)).toBe(3);
  });
});
