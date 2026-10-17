import { describe, expect, it } from "vitest";
import { resolveConfig } from "../../config/validate";
import { mulberry32 } from "../../../shared/rng";
import { buildArchitecture } from "./build";

const art = (over: Record<string, unknown> = {}) => resolveConfig({ ...over }).art;

describe("buildArchitecture", () => {
  it("is deterministic per seed and differs across seeds", () => {
    const a = buildArchitecture(art({ seed: 11 }), mulberry32(11));
    const b = buildArchitecture(art({ seed: 11 }), mulberry32(11));
    const c = buildArchitecture(art({ seed: 12 }), mulberry32(12));
    expect(JSON.stringify(a)).toBe(JSON.stringify(b));
    expect(JSON.stringify(a)).not.toBe(JSON.stringify(c));
  });

  it("keeps a bilaterally symmetric main colonnade with an odd column count and mirrored wings", () => {
    for (const seed of [1, 2, 3, 4, 5]) {
      const scene = buildArchitecture(art({ seed }), mulberry32(seed));
      expect(scene.main.columns.length % 2).toBe(1);
      const sum = scene.main.columns.reduce((acc, c) => acc + c.x, 0);
      expect(Math.abs(sum)).toBeLessThan(1e-9);
      expect(scene.main.arches.length).toBe(scene.main.columns.length - 1);
      expect(scene.wings.length).toBe(2);
      expect(scene.wings[0].columns.length).toBe(scene.wings[1].columns.length);
      expect(scene.wings[0].z).toBeGreaterThan(scene.main.z);
      expect(scene.sky.sun.u).toBe(0.5);
    }
  });

  it("introduces at most one anomaly per kind per colonnade, and none when the rate is zero", () => {
    const none = buildArchitecture(art({ seed: 9, anomalyRate: 0 }), mulberry32(9));
    expect(none.main.columns.some((c) => c.shaft.kind === "helix")).toBe(false);
    expect(none.main.arches.some((a) => a.pointed)).toBe(false);
    expect(none.main.windows.some((w) => w.star)).toBe(false);
    expect(none.main.entablature.flipped).toBe(-1);
    const all = buildArchitecture(art({ seed: 9, anomalyRate: 1 }), mulberry32(9));
    for (const col of [all.main, ...all.wings]) {
      expect(col.columns.filter((c) => c.shaft.kind === "helix").length).toBe(1);
      expect(col.arches.filter((a) => a.pointed).length).toBe(1);
      expect(col.windows.filter((w) => w.star).length).toBe(1);
      expect(col.entablature.flipped).toBeGreaterThanOrEqual(0);
    }
  });

  it("derives ornament schemes from density and complexity", () => {
    const sparse = buildArchitecture(art({ seed: 3, density: 0, complexity: 1, anomalyRate: 0 }), mulberry32(3));
    const dense = buildArchitecture(art({ seed: 3, density: 1, complexity: 5, anomalyRate: 0 }), mulberry32(3));
    const shaft = (s: typeof sparse) => s.main.columns[0].shaft;
    expect(shaft(sparse)).toEqual({ kind: "banded", bands: 4, flutes: 1, dottedChevrons: false });
    expect(shaft(dense)).toEqual({ kind: "banded", bands: 12, flutes: 5, dottedChevrons: true });
    expect(dense.main.arches[0].voussoirs).toBeGreaterThan(sparse.main.arches[0].voussoirs);
    expect(dense.main.arches[0].gallery.length).toBe(4);
    expect(sparse.main.arches[0].gallery.length).toBe(1);
    expect(dense.sky.stars).toBeGreaterThan(sparse.sky.stars);
  });

  it("asymmetric mode may unbalance the wings and shifts the sun off axis", () => {
    const results = [1, 2, 3, 4, 5, 6].map((seed) => buildArchitecture(art({ seed, symmetry: "asymmetric" }), mulberry32(seed)));
    expect(results.some((r) => r.wings[0].columns.length !== r.wings[1].columns.length)).toBe(true);
    for (const r of results) expect(r.sky.sun.u).not.toBe(0.5);
  });
});
