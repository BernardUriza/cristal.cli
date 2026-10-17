import { mulberry32, shuffle, type Rng } from "../shared/rng";
import { bestMarksStore, updateBest as updateBestMark, type BestMarks, type BestUpdate } from "../minigames/kit/bestMarks.ts";
import { dailySeed as kitDailySeed } from "../minigames/kit/dailySeed.ts";
import { artSignature, signatureDistance, type ArtSignature } from "../minigames/kit/templeArt.ts";

export type Card = { id: number; pairId: number; artSeed: number };

export type GameStatus = "playing" | "won";

export type MoveResult = "hit" | "miss";

export type GameState = {
  seed: number;
  cards: Card[];
  faceUp: number[];
  matched: number[];
  moves: number;
  history: MoveResult[];
  status: GameStatus;
};

export const PAIR_OPTIONS = [6, 8, 12] as const;
export type PairCount = (typeof PAIR_OPTIONS)[number];

export const MIN_PAIR_DISTANCE = 2;
const DEAL_TRIES = 40;

export function isPairCount(n: number): n is PairCount {
  return (PAIR_OPTIONS as readonly number[]).includes(n);
}

function nearestDistance(candidate: ArtSignature, chosen: readonly ArtSignature[]): number {
  return chosen.reduce((min, other) => Math.min(min, signatureDistance(candidate, other)), Number.POSITIVE_INFINITY);
}

export function dealArtSeeds(rng: Rng, pairs: number): number[] {
  const seeds: number[] = [];
  const signatures: ArtSignature[] = [];
  for (let pairId = 0; pairId < pairs; pairId++) {
    let best: { seed: number; signature: ArtSignature; distance: number } | null = null;
    for (let attempt = 0; attempt < DEAL_TRIES; attempt++) {
      const seed = Math.floor(rng() * 1_000_000);
      if (seeds.includes(seed)) continue;
      const signature = artSignature(seed);
      const distance = nearestDistance(signature, signatures);
      if (best === null || distance > best.distance) best = { seed, signature, distance };
      if (distance >= MIN_PAIR_DISTANCE) break;
    }
    if (!best) throw new Error("could not deal an art seed");
    seeds.push(best.seed);
    signatures.push(best.signature);
  }
  return seeds;
}

export function newGame(seed: number, pairs: PairCount): GameState {
  const rng = mulberry32(seed);
  const artSeeds = dealArtSeeds(rng, pairs);
  const deck: Card[] = [];
  for (let pairId = 0; pairId < pairs; pairId++) {
    deck.push({ id: pairId * 2, pairId, artSeed: artSeeds[pairId] });
    deck.push({ id: pairId * 2 + 1, pairId, artSeed: artSeeds[pairId] });
  }
  return { seed, cards: shuffle(deck, rng), faceUp: [], matched: [], moves: 0, history: [], status: "playing" };
}

export function isFaceUp(state: GameState, index: number): boolean {
  return state.faceUp.includes(index) || state.matched.includes(index);
}

export function hasPendingPair(state: GameState): boolean {
  return state.faceUp.length === 2;
}

export function pendingIsMatch(state: GameState): boolean {
  if (!hasPendingPair(state)) return false;
  const [a, b] = state.faceUp;
  return state.cards[a].pairId === state.cards[b].pairId;
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
  const isMatch = pendingIsMatch(state);
  const matched = isMatch ? [...state.matched, a, b] : state.matched;
  const status: GameStatus = matched.length === state.cards.length ? "won" : "playing";
  return { ...state, faceUp: [], matched, history: [...state.history, isMatch ? "hit" : "miss"], status };
}

export function pairsFound(state: GameState): number {
  return state.matched.length / 2;
}

export function totalPairs(state: GameState): number {
  return state.cards.length / 2;
}

export function dailySeed(date: Date): number {
  return kitDailySeed("memorama", date);
}

export function resultGlyphs(history: readonly MoveResult[]): string {
  return history.map((move) => (move === "hit" ? "▣" : "▢")).join("");
}

export function shareLine(state: GameState, options: { daily: boolean; url?: string }): string {
  const label = options.daily ? "templo del día" : "templo";
  const parts = [`CRISTAL memorama · ${label} ${state.seed} · ${totalPairs(state)} pares · ${state.moves} movimientos`, resultGlyphs(state.history)];
  if (options.url) parts.push(options.url);
  return parts.filter(Boolean).join("\n");
}

export type { BestMarks };

export function bestKey(seed: number, pairs: number): string {
  return `${seed}:${pairs}`;
}

export function updateBest(best: BestMarks, seed: number, pairs: number, moves: number): BestUpdate {
  return updateBestMark(best, bestKey(seed, pairs), moves);
}

const bestStore = bestMarksStore("cristal.memorama.best.v1");
export const loadBest = bestStore.load;
export const saveBest = bestStore.save;
