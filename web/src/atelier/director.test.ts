import { describe, expect, it } from "vitest";
import { composeIllustration } from "../graphics/application/compose.ts";
import { toSvg } from "../graphics/renderers/svg/serialize.ts";
import { configFor, direct, override, reseed, seedFromNarration } from "./director.ts";

describe("director", () => {
  it("is deterministic: same narration, same seed, same choices", () => {
    expect(direct("un templo de noche")).toEqual(direct("un templo de noche"));
    expect(seedFromNarration("Un Templo ")).toBe(seedFromNarration("un templo"));
  });

  it("decides from the narration and says why, citing the word it found", () => {
    const recipe = direct("una capilla de noche, vacía y torcida, con siete columnas");
    const by = Object.fromEntries(recipe.choices.map((c) => [c.decision.field, c]));
    expect(by.palette.decision.value).toBe("noche");
    expect(by.palette.because).toContain("noche");
    expect(by.complexity.decision.value).toBe(1);
    expect(by.density.decision.value).toBe(0.2);
    expect(by.anomalyRate.decision.value).toBe(0.95);
    expect(by.columns.decision.value).toBe(7);
    expect(by.composition.decision.value).toBe("templo");
    expect(by.ornament.decision.value).toEqual(["estrías"]);
    for (const field of ["palette", "complexity", "density", "anomalyRate", "columns", "composition", "ornament"]) expect(by[field].source).toBe("narración");
    expect(by.anomaly.source).toBe("defecto");
    expect(by.motifs.decision.value).toEqual([]);
  });

  it("reads the studio: composition, motifs, ornament and one anomaly", () => {
    const by = Object.fromEntries(direct("un patio que se recorre con un ojo que vigila, un jaguar y una escalera que sube al cielo, muros de greca").choices.map((c) => [c.decision.field, c]));
    expect(by.composition.decision.value).toBe("patio");
    expect(by.motifs.decision.value).toEqual(["ojo", "jaguar", "escalera"]);
    expect(by.ornament.decision.value).toEqual(["greca"]);
    expect(by.anomaly.decision.value).toBe("escalera-imposible");
    expect(by.motifs.because).toContain("«ojo»");
  });

  it("fills what the narration does not say with defaults, marked as such", () => {
    const recipe = direct("algo");
    const defaults = recipe.choices.filter((c) => c.source === "defecto").map((c) => c.decision.field).sort();
    expect(defaults).toEqual(["anomaly", "anomalyRate", "complexity", "composition", "density", "motifs", "ornament", "palette", "scene"]);
  });

  it("an override replaces the choice and is marked human; a reseed keeps the choices", () => {
    const base = direct("un templo de noche");
    const changed = override(base, { field: "palette", value: "friedeberg" }, "cambiaste la paleta");
    expect(changed.choices.filter((c) => c.decision.field === "palette")).toHaveLength(1);
    expect(changed.choices.find((c) => c.decision.field === "palette")?.source).toBe("humano");
    expect(reseed(base, 99).choices).toEqual(base.choices);
    expect(reseed(base, 99).seed).toBe(99);
  });

  it("the recipe reproduces the exact same drawing", () => {
    const recipe = direct("un templo lleno de galerías imposibles de noche");
    const a = composeIllustration(configFor(recipe, 600, 450));
    const b = composeIllustration(configFor(recipe, 600, 450));
    expect(toSvg(a.layers, a.width, a.height)).toBe(toSvg(b.layers, b.width, b.height));
    expect(a.cfg.art.palette).toBe("noche");
    expect(a.cfg.art.complexity).toBe(5);
  });
});
