// @ts-ignore - Vitest is supplied by the test runner when these specs are run.
import { describe, expect, it } from "vitest";
import { classifyStance } from "./StanceClassifier";

describe("classifyStance", () => {
  it("reads a bodily confession", () => {
    expect(classifyStance("me duele el pecho").stance).toBe("confession");
  });

  it("reads technical causation as intellectualization", () => {
    expect(
      classifyStance("mi ansiedad se debe a patrones neuroquímicos").stance
    ).toBe("intellectualization");
  });

  it("reads flat negation as anesthesia", () => {
    expect(classifyStance("no siento nada, da igual").stance).toBe("anesthesia");
  });

  it("reads dismissive humor as deflection", () => {
    expect(classifyStance("jaja qué profundo, siguiente pregunta").stance).toBe(
      "deflection"
    );
  });

  it("reads symbolic self-myth as ritualization", () => {
    expect(classifyStance("soy un arcano roto bajo la luna").stance).toBe(
      "ritualization"
    );
  });

  it("catches the body explained away as intellectualization (golden)", () => {
    const p = classifyStance("me duele porque mi peristalsis no es buena");
    expect(p.stance).toBe("intellectualization");
    expect(p.signals).toContain("causal-chain");
  });

  it("normalizes accents so diacritics never break matching", () => {
    expect(classifyStance("tengo MIEDO y me siento solo").stance).toBe("confession");
  });

  it("exposes graded signal scores in 0..1", () => {
    const p = classifyStance("me duele el pecho");
    for (const v of [p.bodyPresence, p.abstractionLevel, p.emotionalExposure, p.confidence]) {
      expect(v).toBeGreaterThanOrEqual(0);
      expect(v).toBeLessThanOrEqual(1);
    }
  });
});
