// @ts-ignore - Vitest is supplied by the test runner when these specs are run.
import { describe, expect, it } from "vitest";
import { generateCristalPsychReply } from "./PsychologicalResponseEngine";

const FORBIDDEN = /no\s+(te\s+)?entend|i\s+don'?t\s+understand|context:\s*undefined/i;

describe("generateCristalPsychReply", () => {
  it("routes all five stances to a non-empty reply, never forbidden", () => {
    const inputs = [
      "me duele el pecho",
      "mi ansiedad se debe a patrones neuroquímicos",
      "no siento nada, da igual",
      "jaja qué profundo, siguiente pregunta",
      "soy un arcano roto bajo la luna",
    ];
    for (const input of inputs) {
      const reply = generateCristalPsychReply(input);
      expect(reply.text.length).toBeGreaterThan(0);
      expect(reply.forbiddenPhrasePresent).toBe(false);
      expect(FORBIDDEN.test(reply.text)).toBe(false);
    }
  });

  it("answers empty input with a reflective opener, never confusion", () => {
    const reply = generateCristalPsychReply("");
    expect(reply.text.length).toBeGreaterThan(0);
    expect(FORBIDDEN.test(reply.text)).toBe(false);
  });

  it("answers signal-less garbage with a reflective opener, never confusion", () => {
    const reply = generateCristalPsychReply("asdfgh qwerty");
    expect(reply.text.length).toBeGreaterThan(0);
    expect(FORBIDDEN.test(reply.text)).toBe(false);
  });

  it("composes end-to-end: intellectualized body gets the sensation redirect", () => {
    const reply = generateCristalPsychReply("me duele porque mi peristalsis no es buena");
    expect(reply.asksForBody).toBe(true);
    expect(reply.text.toLowerCase()).toMatch(/cuerpo|carne|aprieta|duele/);
  });
});
