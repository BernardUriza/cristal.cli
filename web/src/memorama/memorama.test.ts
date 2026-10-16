import { describe, expect, it } from "vitest";
import { flip, hasPendingPair, isFaceUp, newGame, pairsFound, resolve, totalPairs, type GameState } from "./memorama.ts";

function indicesOfPair(state: GameState, pairId: number): [number, number] {
  const idx = state.cards.map((c, i) => (c.pairId === pairId ? i : -1)).filter((i) => i >= 0);
  return [idx[0], idx[1]];
}

describe("newGame", () => {
  it("deals two cards per pair, each pair sharing one art seed", () => {
    const g = newGame(42, 8);
    expect(g.cards).toHaveLength(16);
    for (let p = 0; p < 8; p++) {
      const [a, b] = indicesOfPair(g, p);
      expect(g.cards[a].artSeed).toBe(g.cards[b].artSeed);
      expect(g.cards[a].id).not.toBe(g.cards[b].id);
    }
    expect(new Set(g.cards.map((c) => c.id)).size).toBe(16);
  });

  it("is deterministic per seed and differs across seeds", () => {
    const a = newGame(7, 6);
    const b = newGame(7, 6);
    const c = newGame(8, 6);
    expect(a).toEqual(b);
    expect(c.cards.map((x) => x.pairId)).not.toEqual(a.cards.map((x) => x.pairId));
    expect(c.cards.map((x) => x.artSeed)).not.toEqual(a.cards.map((x) => x.artSeed));
  });

  it("gives every pair a distinct art seed", () => {
    const g = newGame(3, 12);
    expect(new Set(g.cards.map((c) => c.artSeed)).size).toBe(12);
  });

  it("actually shuffles: pairs are not adjacent in deal order", () => {
    const g = newGame(99, 12);
    const adjacent = g.cards.filter((c, i) => i > 0 && g.cards[i - 1].pairId === c.pairId).length;
    expect(adjacent).toBeLessThan(12);
  });
});

describe("flip and resolve", () => {
  it("counts a move when the second card turns and keeps a mismatch pending until resolved", () => {
    const g0 = newGame(5, 6);
    const [a] = indicesOfPair(g0, 0);
    const [b] = indicesOfPair(g0, 1);
    const g1 = flip(g0, a);
    expect(g1.moves).toBe(0);
    expect(isFaceUp(g1, a)).toBe(true);
    const g2 = flip(g1, b);
    expect(g2.moves).toBe(1);
    expect(hasPendingPair(g2)).toBe(true);
    expect(flip(g2, indicesOfPair(g0, 2)[0])).toBe(g2);
    const g3 = resolve(g2);
    expect(g3.faceUp).toEqual([]);
    expect(g3.matched).toEqual([]);
    expect(isFaceUp(g3, a)).toBe(false);
  });

  it("keeps a matched pair face up and ignores flips on it", () => {
    const g0 = newGame(5, 6);
    const [a, b] = indicesOfPair(g0, 0);
    const g = resolve(flip(flip(g0, a), b));
    expect(g.matched).toEqual([a, b]);
    expect(isFaceUp(g, a)).toBe(true);
    expect(flip(g, a)).toBe(g);
    expect(pairsFound(g)).toBe(1);
    expect(totalPairs(g)).toBe(6);
  });

  it("ignores a flip on the card already face up and on out-of-range indices", () => {
    const g0 = newGame(5, 6);
    const g1 = flip(g0, 0);
    expect(flip(g1, 0)).toBe(g1);
    expect(flip(g1, -1)).toBe(g1);
    expect(flip(g1, 12)).toBe(g1);
  });

  it("wins when every pair is matched and freezes afterwards", () => {
    let g = newGame(11, 6);
    for (let p = 0; p < 6; p++) {
      const [a, b] = indicesOfPair(g, p);
      g = resolve(flip(flip(g, a), b));
    }
    expect(g.status).toBe("won");
    expect(g.moves).toBe(6);
    expect(pairsFound(g)).toBe(6);
    expect(flip(g, 0)).toBe(g);
  });

  it("resolve is a no-op without a pending pair", () => {
    const g = flip(newGame(1, 6), 0);
    expect(resolve(g)).toBe(g);
  });
});
