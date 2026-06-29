// @ts-ignore - Vitest is supplied by the test runner when these specs are run.
import { beforeEach, describe, expect, it } from "vitest";
import {
  generateCristalPsychReply,
  getPsychPressure,
  resetPsychSession,
} from "./PsychologicalResponseEngine";

const FORBIDDEN = /no\s+(te\s+)?entend|i\s+don'?t\s+understand|context:\s*undefined/i;

describe("generateCristalPsychReply", () => {
  beforeEach(() => resetPsychSession());

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

  it("answers empty and signal-less input with a reflective opener", () => {
    expect(generateCristalPsychReply("").text.length).toBeGreaterThan(0);
    expect(FORBIDDEN.test(generateCristalPsychReply("asdfgh qwerty").text)).toBe(false);
  });

  it("composes end-to-end: intellectualized body gets the sensation redirect", () => {
    const reply = generateCristalPsychReply("me duele porque mi peristalsis no es buena");
    expect(reply.asksForBody).toBe(true);
    expect(reply.text.toLowerCase()).toMatch(/cuerpo|carne|aprieta|duele/);
  });

  it("C2: pressure climbs and names the pattern when the player keeps evading", () => {
    generateCristalPsychReply("mi ansiedad se debe a patrones neuroquímicos");
    const first = getPsychPressure().pressure;
    generateCristalPsychReply("se explica por mi cortisol y mis patrones de sueño");
    const reply = generateCristalPsychReply("es un proceso neuroquímico, un mecanismo lógico");
    expect(getPsychPressure().pressure).toBeGreaterThan(first);
    expect(reply.text.toLowerCase()).toContain("sigues explic");
    expect(reply.tone).toBe("press");
  });

  it("C2: confession after evasion relieves the pressure", () => {
    generateCristalPsychReply("jaja qué profundo, siguiente pregunta");
    generateCristalPsychReply("jaja como sea, da lo mismo, siguiente");
    const high = getPsychPressure().pressure;
    generateCristalPsychReply("tengo miedo y me siento solo, me duele el pecho");
    expect(getPsychPressure().pressure).toBeLessThan(high);
  });
});
