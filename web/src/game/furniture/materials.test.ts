import { describe, expect, it } from "vitest";
import { FURNITURE_MATERIALS } from "./materials";

const PROFILES = ["paintedMetal", "bareMetal", "dustyPlastic", "cardboard", "dirtyCarpet", "smudgedGlass", "agedLaminate"];

describe("FURNITURE_MATERIALS", () => {
  it("keeps the thirty materials the catalog paints with, each on a known texture profile", () => {
    const specs = Object.values(FURNITURE_MATERIALS);
    expect(specs).toHaveLength(30);
    for (const spec of specs) {
      expect(PROFILES).toContain(spec.profile);
      expect(spec.normalScale).toBeGreaterThan(0);
      expect(spec.params.color).toMatch(/^#[0-9a-f]{6}$/);
    }
  });
});
