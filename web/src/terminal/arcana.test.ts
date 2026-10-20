import { describe, expect, it } from "vitest";
import { ARCANA, findArcana } from "./arcana";

describe("arcana", () => {
  it("holds the 22 Major Arcana numbered 0 to 21", () => {
    expect(ARCANA.map((a) => a.number)).toEqual(Array.from({ length: 22 }, (_, i) => i));
  });

  it("finds by number, full name or name without the article", () => {
    expect(findArcana("18")?.name).toBe("THE MOON");
    expect(findArcana(" The Moon ")?.number).toBe(18);
    expect(findArcana("moon")?.number).toBe(18);
    expect(findArcana("strength")?.number).toBe(8);
    expect(findArcana("nada")).toBeNull();
    expect(findArcana("99")).toBeNull();
  });
});
