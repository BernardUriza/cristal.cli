import { mulberry32, type Rng } from "../shared/rng";

export type Card = { id: number; pairId: number; artSeed: number };

export type GameStatus = "playing" | "won";

export type GameState = {
  seed: number;
  cards: Card[];
  faceUp: number[];
  matched: number[];
  moves: number;
  status: GameStatus;
};

export const PAIR_OPTIONS = [6, 8, 12] as const;
export type PairCount = (typeof PAIR_OPTIONS)[number];

export function isPairCount(n: number): n is PairCount {
  return (PAIR_OPTIONS as readonly number[]).includes(n);
}

export function shuffle<T>(items: readonly T[], rng: Rng): T[] {
  const out = [...items];
  for (let i = out.length - 1; i > 0; i--) {
    const j = Math.floor(rng() * (i + 1));
    [out[i], out[j]] = [out[j], out[i]];
  }
  return out;
}

export function newGame(seed: number, pairs: PairCount): GameState {
  const rng = mulberry32(seed);
  const artSeeds = Array.from({ length: pairs }, () => Math.floor(rng() * 1_000_000));
  const deck: Card[] = [];
  for (let pairId = 0; pairId < pairs; pairId++) {
    deck.push({ id: pairId * 2, pairId, artSeed: artSeeds[pairId] });
    deck.push({ id: pairId * 2 + 1, pairId, artSeed: artSeeds[pairId] });
  }
  return { seed, cards: shuffle(deck, rng), faceUp: [], matched: [], moves: 0, status: "playing" };
}

export function isFaceUp(state: GameState, index: number): boolean {
  return state.faceUp.includes(index) || state.matched.includes(index);
}

export function hasPendingPair(state: GameState): boolean {
  return state.faceUp.length === 2;
}

export function flip(state: GameState, index: number): GameState {
  if (state.status === "won") return state;
  if (index < 0 || index >= state.cards.length) return state;
  if (isFaceUp(state, index) || hasPendingPair(state)) return state;
  const faceUp = [...state.faceUp, index];
  const moves = faceUp.length === 2 ? state.moves + 1 : state.moves;
  return { ...state, faceUp, moves };
}

export function resolve(state: GameState): GameState {
  if (!hasPendingPair(state)) return state;
  const [a, b] = state.faceUp;
  const isMatch = state.cards[a].pairId === state.cards[b].pairId;
  const matched = isMatch ? [...state.matched, a, b] : state.matched;
  const status: GameStatus = matched.length === state.cards.length ? "won" : "playing";
  return { ...state, faceUp: [], matched, status };
}

export function pairsFound(state: GameState): number {
  return state.matched.length / 2;
}

export function totalPairs(state: GameState): number {
  return state.cards.length / 2;
}
