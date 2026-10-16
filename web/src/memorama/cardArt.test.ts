import { describe, expect, it } from "vitest";
import { composeIllustration } from "../graphics/application/compose.ts";
import { toSvg } from "../graphics/renderers/svg/serialize.ts";
import { CARD_HEIGHT, CARD_WIDTH, cardArtInput } from "./cardArt.ts";
import { newGame } from "./memorama.ts";

describe("cardArtInput", () => {
  it("is deterministic per art seed", () => {
    expect(cardArtInput(123)).toEqual(cardArtInput(123));
  });

  it("varies palette, complexity and projection across seeds", () => {
    const inputs = Array.from({ length: 40 }, (_, i) => cardArtInput(i * 7919 + 13));
    expect(new Set(inputs.map((i) => i.palette)).size).toBe(2);
    expect(new Set(inputs.map((i) => i.complexity)).size).toBeGreaterThan(3);
    expect(new Set(inputs.map((i) => i.tech?.projection?.kind)).size).toBe(2);
  });

  it("composes a card-sized illustration that differs between the pairs of a game", () => {
    const game = newGame(21, 6);
    const svgs = new Set<string>();
    for (const card of game.cards) {
      const ill = composeIllustration(cardArtInput(card.artSeed));
      expect(ill.width).toBe(CARD_WIDTH);
      expect(ill.height).toBe(CARD_HEIGHT);
      svgs.add(toSvg(ill.layers, ill.width, ill.height));
    }
    expect(svgs.size).toBe(6);
  });
});
