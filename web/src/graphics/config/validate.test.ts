import { describe, expect, it } from "vitest";
import { PRESET_NAMES, presetInput } from "./presets";
import { DEFAULT_ART, DEFAULT_TECH } from "./types";
import { ConfigError, resolveConfig } from "./validate";

describe("resolveConfig", () => {
  it("fills defaults and keeps art and tech apart", () => {
    const cfg = resolveConfig({ seed: 3 });
    expect(cfg.art).toEqual({ ...DEFAULT_ART, seed: 3 });
    expect(cfg.tech).toEqual(DEFAULT_TECH);
  });

  it("clamps unit ranges and rounds integers", () => {
    const cfg = resolveConfig({ density: 1.7, anomalyRate: -2, complexity: 9.4, seed: 2.6 });
    expect(cfg.art.density).toBe(1);
    expect(cfg.art.anomalyRate).toBe(0);
    expect(cfg.art.complexity).toBe(5);
    expect(cfg.art.seed).toBe(3);
  });

  it("rejects values outside the grammar", () => {
    expect(() => resolveConfig({ palette: "neon" as never })).toThrow(ConfigError);
    expect(() => resolveConfig({ columns: 4 })).toThrow(ConfigError);
    expect(() => resolveConfig({ seed: Number.NaN })).toThrow(ConfigError);
    expect(() => resolveConfig({ tech: { renderBackend: "webgpu" as never } })).toThrow(ConfigError);
    expect(() => resolveConfig({ tech: { projection: { kind: "isometric" as never } } })).toThrow(ConfigError);
  });

  it("merges nested tech groups without losing siblings", () => {
    const cfg = resolveConfig({ tech: { projection: { kind: "elevation" }, lod: { detailScale: 2 } } });
    expect(cfg.tech.projection).toEqual({ ...DEFAULT_TECH.projection, kind: "elevation" });
    expect(cfg.tech.lod.detailScale).toBe(2);
    expect(cfg.tech.width).toBe(DEFAULT_TECH.width);
  });

  it("every preset resolves", () => {
    for (const name of PRESET_NAMES) expect(() => resolveConfig(presetInput(name))).not.toThrow();
    expect(() => presetInput("nope")).toThrow();
  });
});
