import { describe, expect, it } from "vitest";
import { cellFigure, cellFrequency, cellHue, cellKey, cellSemitone, lightCell } from "./trail";

describe("trail", () => {
  it("lights a cell once and keeps the same list when it is stepped on again", () => {
    const first = lightCell([], 2, 3);
    expect(first).toEqual([cellKey(2, 3)]);
    expect(lightCell(first, 2, 3)).toBe(first);
    expect(lightCell(first, 3, 3)).toHaveLength(2);
  });

  it("only ever sounds notes of one pentatonic scale, so no step is a wrong note", () => {
    const allowed = new Set([0, 2, 4, 7, 9]);
    for (let y = 0; y < 8; y++) {
      for (let x = 0; x < 8; x++) {
        expect(allowed.has(cellSemitone(x, y) % 12)).toBe(true);
        expect(cellFrequency(x, y)).toBeGreaterThan(190);
        expect(cellFrequency(x, y)).toBeLessThan(1400);
      }
    }
  });

  it("gives neighbouring cells clearly different colours", () => {
    for (let x = 0; x < 7; x++) {
      const gap = Math.abs(cellHue(x, 0, 8) - cellHue(x + 1, 0, 8));
      expect(Math.min(gap, 1 - gap)).toBeGreaterThan(0.2);
    }
  });

  it("draws between one and three figures per tile", () => {
    for (let y = 0; y < 8; y++) {
      for (let x = 0; x < 8; x++) {
        const figure = cellFigure(x, y);
        expect(figure.rings).toBeGreaterThanOrEqual(1);
        expect(figure.rings).toBeLessThanOrEqual(3);
        expect([4, 6, 8, 12]).toContain(figure.sides);
      }
    }
  });
});
