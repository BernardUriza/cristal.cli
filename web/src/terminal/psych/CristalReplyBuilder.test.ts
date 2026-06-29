// @ts-ignore - Vitest is supplied by the test runner when these specs are run.
import { describe, expect, it } from "vitest";
import { classifyStance } from "./StanceClassifier";
import { buildResponse } from "./CristalReplyBuilder";

const FORBIDDEN = /no\s+(te\s+)?entend|i\s+don'?t\s+understand|context:\s*undefined/i;

describe("buildResponse", () => {
  it("never admits incomprehension for any stance", () => {
    const inputs = [
      "me duele el pecho",
      "mi ansiedad se debe a patrones neuroquímicos",
      "no siento nada, da igual",
      "jaja qué profundo, siguiente pregunta",
      "soy un arcano roto bajo la luna",
    ];
    for (const input of inputs) {
      const reply = buildResponse(classifyStance(input), input);
      expect(reply.forbiddenPhrasePresent).toBe(false);
      expect(FORBIDDEN.test(reply.text)).toBe(false);
      expect(reply.text.length).toBeGreaterThan(0);
    }
  });

  it("redirects an intellectualized body to the sensation (golden)", () => {
    const input = "me duele porque mi peristalsis no es buena";
    const reply = buildResponse(classifyStance(input), input);
    expect(reply.asksForBody).toBe(true);
    expect(reply.text.toLowerCase()).toMatch(/explic|mecanismo|causa/);
    expect(reply.text.toLowerCase()).toMatch(/cuerpo|carne|aprieta|duele/);
  });

  it("is deterministic — same input yields the same reply", () => {
    const input = "soy un arcano roto bajo la luna";
    const a = buildResponse(classifyStance(input), input);
    const b = buildResponse(classifyStance(input), input);
    expect(a.text).toBe(b.text);
  });

  it("maps each stance to a tone", () => {
    const map: Record<string, string> = {
      "me duele el pecho": "mirror",
      "mi ansiedad se debe a patrones neuroquímicos": "interrupt",
      "no siento nada, da igual": "press",
      "soy un arcano roto bajo la luna": "ritual",
    };
    for (const [input, tone] of Object.entries(map)) {
      expect(buildResponse(classifyStance(input), input).tone).toBe(tone);
    }
  });
});
