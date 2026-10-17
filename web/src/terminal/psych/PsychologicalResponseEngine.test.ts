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

  it("reflects signal-less input in character, then pivots on the second one (Façade catch-all)", () => {
    const first = generateCristalPsychReply("zxqv");
    expect(first.text).toContain("«zxqv»");
    expect(first.stance).toBeNull();
    expect(FORBIDDEN.test(first.text)).toBe(false);

    const second = generateCristalPsychReply("qwerty", { objective: "Invoca un glifo: LUNA, VISION o ROTURA." });
    expect(second.stance).toBeNull();
    expect(second.text).not.toContain("«qwerty»");
    expect(second.text.length).toBeGreaterThan(0);

    expect(generateCristalPsychReply("").text.length).toBeGreaterThan(0);
  });

  it("treats a short answer after its own body question as confession", () => {
    generateCristalPsychReply("mi ansiedad se debe a patrones neuroquímicos");
    const reply = generateCristalPsychReply("tibia");
    expect(reply.stance).toBe("confession");
    expect(reply.tone).toBe("mirror");
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
    expect(reply.text.toLowerCase()).toMatch(/sigues explic|otra vez el mapa|explicas más rápido/);
    expect(reply.tone).toBe("press");
  });

  it("C2: confession after evasion relieves the pressure", () => {
    generateCristalPsychReply("jaja qué profundo, siguiente pregunta");
    generateCristalPsychReply("jaja como sea, da lo mismo, siguiente");
    const high = getPsychPressure().pressure;
    generateCristalPsychReply("tengo miedo y me siento solo, me duele el pecho");
    expect(getPsychPressure().pressure).toBeLessThan(high);
  });

  it("never presses back when the player answers the temperature question from the body (me.tikkum)", () => {
    generateCristalPsychReply("me siento cansado y confundido");
    generateCristalPsychReply("LUNA");
    for (const answer of ["es fría", "tiene frío", "sufre por el frío", "incomodidad"]) {
      const reply = generateCristalPsychReply(answer);
      expect(reply.stance, answer).toBe("confession");
      expect(reply.tone, answer).toBe("mirror");
      expect(reply.text, answer).not.toMatch(/Escribe desde el cuerpo|nada que replicar/);
    }
  });

  it("marks an opener as unclassified so the silence engine cannot count it as a turn", () => {
    expect(generateCristalPsychReply("asdfgh qwerty").stance).toBeNull();
    expect(generateCristalPsychReply("me duele el pecho").stance).toBe("confession");
  });

  it("never says the same line twice in a row across twelve evasive turns", () => {
    const lines: string[] = [];
    for (let i = 0; i < 12; i++) lines.push(generateCristalPsychReply("jaja qué profundo, siguiente pregunta").text);
    for (let i = 1; i < lines.length; i++) expect(lines[i], `turn ${i}`).not.toBe(lines[i - 1]);
  });
});
