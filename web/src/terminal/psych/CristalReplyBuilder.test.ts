import { describe, expect, it } from "vitest";
import { classifyStance } from "./StanceClassifier";
import { buildResponse, FORBIDDEN } from "./CristalReplyBuilder";
import { createBagState, type BagState } from "./ReplyBag";

function replies(input: string, turns: number, sessionId = "s"): string[] {
  let bag: BagState = createBagState();
  const out: string[] = [];
  for (let turn = 0; turn < turns; turn++) {
    const built = buildResponse(classifyStance(input), input, { sessionId, turn }, bag);
    bag = built.bag;
    out.push(built.reply.text);
  }
  return out;
}

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
      for (const text of replies(input, 12)) {
        expect(FORBIDDEN.test(text), input).toBe(false);
        expect(text.length).toBeGreaterThan(0);
      }
    }
  });

  it("redirects an intellectualized body to the sensation (golden)", () => {
    const input = "me duele porque mi peristalsis no es buena";
    const { reply } = buildResponse(classifyStance(input), input);
    expect(reply.asksForBody).toBe(true);
    expect(reply.stance).toBe("intellectualization");
  });

  it("is deterministic per session and turn, and never repeats the same line twice in a row", () => {
    const a = replies("soy un arcano roto bajo la luna", 10, "x");
    const b = replies("soy un arcano roto bajo la luna", 10, "x");
    expect(a).toEqual(b);
    for (let i = 1; i < a.length; i++) expect(a[i], `turn ${i}`).not.toBe(a[i - 1]);
    expect(new Set(a.slice(0, 8)).size).toBe(8);
  });

  it("names the pattern when the player keeps hiding the same way", () => {
    const input = "mi ansiedad se debe a patrones neuroquímicos";
    const { reply } = buildResponse(classifyStance(input), input, { repeating: true });
    expect(reply.tone).toBe("press");
    expect(reply.text).toMatch(/Sigues explicándolo|Otra vez el mapa/);
  });

  it("quotes the archived confession when the context carries one", () => {
    const input = "jaja qué profundo, siguiente pregunta";
    const { reply } = buildResponse(classifyStance(input), input, { confessionFragment: "tengo miedo" });
    expect(reply.text).toContain("«tengo miedo»");
  });

  it("maps each stance to a tone", () => {
    const map: Record<string, string> = {
      "me duele el pecho": "mirror",
      "mi ansiedad se debe a patrones neuroquímicos": "interrupt",
      "no siento nada, da igual": "press",
      "soy un arcano roto bajo la luna": "ritual",
    };
    for (const [input, tone] of Object.entries(map)) {
      expect(buildResponse(classifyStance(input), input).reply.tone).toBe(tone);
    }
  });
});
