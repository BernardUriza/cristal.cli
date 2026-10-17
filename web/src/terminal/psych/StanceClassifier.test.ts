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

  it("reads explicit Spanish topic changes as deflection", () => {
    expect(classifyStance("siguiente. no. paso. cambia de tema ya.").stance).toBe(
      "deflection"
    );
    expect(classifyStance("jaja que pregunta rara, cambiemos de tema").stance).toBe(
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

  it("reads the tester's thermal and bodily answers as confession (me.tikkum, 2026-10-16)", () => {
    for (const answer of ["es fría", "tiene frío", "sufre por el frío", "incomodidad"]) {
      const profile = classifyStance(answer);
      expect(profile.signals, answer).toContain("body-term");
      expect(profile.stance, answer).toBe("confession");
    }
  });

  it("reads tired-and-confused as an emotional confession, not noise", () => {
    const profile = classifyStance("me siento cansado y confundido");
    expect(profile.signals).toContain("emotion-term");
    expect(profile.stance).toBe("confession");
  });

  it("reads short sensory answers to a body question as confession (Façade §6: permissive)", () => {
    for (const answer of ["tibia", "como una piedra", "pesa", "oscura y lenta", "quema un poco", "chiquita"]) {
      const profile = classifyStance(answer, { afterBodyQuestion: true });
      expect(profile.stance, answer).toBe("confession");
      expect(profile.signals.length, answer).toBeGreaterThan(0);
    }
  });

  it("does not turn an evasive short answer into a confession just because a body question came first", () => {
    expect(classifyStance("jaja siguiente", { afterBodyQuestion: true }).stance).toBe("deflection");
    expect(classifyStance("da igual", { afterBodyQuestion: true }).stance).toBe("anesthesia");
    expect(classifyStance("zxqv", { afterBodyQuestion: false }).signals).toEqual([]);
  });

  it("exposes the salient word the reply can mirror", () => {
    expect(classifyStance("sufre por el frío").salientWord).toBe("frío");
    expect(classifyStance("es fría").salientWord).toBe("fría");
    expect(classifyStance("zxqv").salientWord).toBe("zxqv");
  });
});
