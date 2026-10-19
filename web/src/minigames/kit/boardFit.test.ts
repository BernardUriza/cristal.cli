import { describe, expect, it } from "vitest";
import { fitBoard } from "./boardFit.ts";

const portrait = { width: 366, height: 640, gap: 8, aspect: 3 / 4 };
const landscape = { width: 1060, height: 640, gap: 10, aspect: 3 / 4 };

describe("fitBoard", () => {
  it("never overflows the box it was given", () => {
    for (const box of [portrait, landscape]) {
      for (const cards of [12, 16, 24]) {
        const fit = fitBoard({ cards, ...box });
        expect(fit.columns * fit.cardWidth + (fit.columns - 1) * box.gap).toBeLessThanOrEqual(box.width);
        expect(fit.rows * (fit.cardWidth / box.aspect) + (fit.rows - 1) * box.gap).toBeLessThanOrEqual(box.height + 1);
        expect(fit.columns * fit.rows).toBeGreaterThanOrEqual(cards);
      }
    }
  });

  it("uses fewer columns on a phone than on a wide screen", () => {
    expect(fitBoard({ cards: 24, ...portrait }).columns).toBeLessThan(fitBoard({ cards: 24, ...landscape }).columns);
  });

  it("gives 24 cards on a phone a full grid that fits without scrolling", () => {
    const fit = fitBoard({ cards: 24, ...portrait });
    expect(fit.columns * fit.rows).toBe(24);
    expect(fit.cardWidth).toBeGreaterThan(60);
  });
});
