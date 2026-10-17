import { fnv1a, mulberry32, type Rng } from "../shared/rng";
import { artSignature, signatureDistance, type ArtSignature } from "./cardArt.ts";

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

export function shuffle<T>(items: readonly T[], rng: Rng): T[] {
  const out = [...items];
  for (let i = out.length - 1; i > 0; i--) {
    const j = Math.floor(rng() * (i + 1));
    [out[i], out[j]] = [out[j], out[i]];
  }
  return out;
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
  const day = `${date.getFullYear()}-${String(date.getMonth() + 1).padStart(2, "0")}-${String(date.getDate()).padStart(2, "0")}`;
  return (fnv1a(`cristal-memorama-${day}`) % 1_000_000) + 1;
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

export type BestMarks = Record<string, number>;

export function bestKey(seed: number, pairs: number): string {
  return `${seed}:${pairs}`;
}

export function updateBest(best: BestMarks, seed: number, pairs: number, moves: number): { best: BestMarks; isRecord: boolean; previous: number | null } {
  const key = bestKey(seed, pairs);
  const previous = best[key] ?? null;
  if (previous !== null && previous <= moves) return { best, isRecord: false, previous };
  return { best: { ...best, [key]: moves }, isRecord: true, previous };
}

const BEST_STORAGE_KEY = "cristal.memorama.best.v1";

export function loadBest(): BestMarks {
  if (typeof window === "undefined") return {};
  try {
    const parsed = JSON.parse(window.localStorage.getItem(BEST_STORAGE_KEY) || "{}") as unknown;
    if (typeof parsed !== "object" || parsed === null || Array.isArray(parsed)) return {};
    const out: BestMarks = {};
    for (const [key, value] of Object.entries(parsed as Record<string, unknown>)) if (typeof value === "number") out[key] = value;
    return out;
  } catch {
    return {};
  }
}

export function saveBest(best: BestMarks): void {
  if (typeof window === "undefined") return;
  try {
    window.localStorage.setItem(BEST_STORAGE_KEY, JSON.stringify(best));
  } catch {
    return;
  }
}
