export type DiscoveryKind = "node" | "inscription" | "phrase" | "glyph" | "room";

export interface DiscoveryState {
  lastFindAt: number;
  finds: number;
  longestGapMs: number;
  starvations: number;
  seenKeys: string[];
}

export const STARVATION_MS = 60000;

export function createDiscoveryState(now: number): DiscoveryState {
  return { lastFindAt: now, finds: 0, longestGapMs: 0, starvations: 0, seenKeys: [] };
}

function withFind(state: DiscoveryState, now: number): Pick<DiscoveryState, "lastFindAt" | "finds" | "longestGapMs"> {
  return {
    lastFindAt: now,
    finds: state.finds + 1,
    longestGapMs: Math.max(state.longestGapMs, now - state.lastFindAt),
  };
}

export function noteDiscovery(state: DiscoveryState, kind: DiscoveryKind, key: string, now: number): DiscoveryState {
  const seenKey = `${kind}:${key}`;
  if (state.seenKeys.includes(seenKey)) return state;
  return { ...state, ...withFind(state, now), seenKeys: [...state.seenKeys, seenKey] };
}

export function isStarved(state: DiscoveryState, now: number): boolean {
  return now - state.lastFindAt >= STARVATION_MS;
}

export function noteStarvationRelief(state: DiscoveryState, now: number): DiscoveryState {
  return { ...state, ...withFind(state, now), starvations: state.starvations + 1 };
}

export function secondsSinceFind(state: DiscoveryState, now: number): number {
  return Math.max(0, Math.floor((now - state.lastFindAt) / 1000));
}
