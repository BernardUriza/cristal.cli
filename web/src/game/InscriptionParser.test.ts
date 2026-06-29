import { describe, it, expect } from "vitest";
import { parseInscription } from "./InscriptionParser";

describe("InscriptionParser", () => {
  it("marks Spanish dread inscriptions as threatening", () => {
    const signals = parseInscription("La muerte bebe sangre; el miedo abre la puerta.");

    expect(signals.mood).toBe("dread");
    expect(signals.threatLevel).toBeGreaterThan(0);
  });

  it("detects bilingual symbols with canonical names", () => {
    const signals = parseInscription("El espejo watches the eye; otro ojo behind the mirror.");

    expect(signals.symbols).toEqual(["mirror", "eye"]);
  });

  it("filters common Spanish and English stopwords from keywords", () => {
    const signals = parseInscription("el checksum mintió y the truth spreads");

    expect(signals.keywords).toEqual(["checksum", "mintió", "truth", "spreads"]);
  });

  it("returns empty neutral signals for whitespace", () => {
    expect(parseInscription("   \n\t  ")).toEqual({
      keywords: [],
      mood: "neutral",
      threatLevel: 0,
      symbols: [],
    });
  });

  it("caps and de-dupes keywords", () => {
    const signals = parseInscription(
      "luz luz archivo archivo llave cámara nodo sombra espejo túnel signo brújula altar memoria",
    );

    expect(signals.keywords).toEqual([
      "luz",
      "archivo",
      "llave",
      "cámara",
      "nodo",
      "sombra",
      "espejo",
      "túnel",
    ]);
  });
});
