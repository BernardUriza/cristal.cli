import { generateRoom, type Room } from "../roomApi";
import type { SymbolicArchetype } from "../symbolicBus";
import { ROOM_CACHE_LIMIT } from "./config";

interface PreparedGlyphRoom {
  seed: number;
  confession: string | null;
}

// Module scope, not store state: cache reads never re-render React. Bounded FIFO
// so an endless descent can't grow without limit.
const roomCache = new Map<number, Room>();
const pendingRooms = new Map<number, Promise<Room>>();
const preparedGlyphRooms = new Map<string, PreparedGlyphRoom>();
let roomRequestId = 0;

// Monotonic token: any flow change (new load, collapse, dismiss) bumps it, so a
// stale server response can never overwrite the room the player already left.
export const roomRequests = {
  begin: (): number => ++roomRequestId,
  isCurrent: (id: number): boolean => id === roomRequestId,
  invalidate: (): void => {
    roomRequestId += 1;
  },
};

export function cachedRoom(seed: number): Room | undefined {
  return roomCache.get(seed);
}

export function isRoomReadyOrPending(seed: number): boolean {
  return roomCache.has(seed) || pendingRooms.has(seed);
}

export function cacheRoom(seed: number, room: Room): void {
  roomCache.set(seed, room);
  if (roomCache.size > ROOM_CACHE_LIMIT) {
    const oldest = roomCache.keys().next().value;
    if (oldest !== undefined) roomCache.delete(oldest);
  }
}

export function requestRoom(
  seed: number,
  archetype: SymbolicArchetype,
  depth: number,
  fragments: string[]
): Promise<Room> {
  const pending = pendingRooms.get(seed);
  if (pending) return pending;
  const request = generateRoom({ seed, archetype, depth, fragments })
    .then((room) => {
      cacheRoom(seed, room);
      return room;
    })
    .finally(() => pendingRooms.delete(seed));
  pendingRooms.set(seed, request);
  return request;
}

export function preparedGlyphRoom(glyphId: string): PreparedGlyphRoom | undefined {
  return preparedGlyphRooms.get(glyphId);
}

export function rememberGlyphRoom(glyphId: string, prepared: PreparedGlyphRoom): void {
  preparedGlyphRooms.set(glyphId, prepared);
}

export function forgetGlyphRoom(glyphId: string): void {
  preparedGlyphRooms.delete(glyphId);
}

// One deterministic trap door per room; single-exit rooms are never traps.
export function fakeExitForRoom(room: Room): number {
  return room.exits.length > 1 ? room.seed % room.exits.length : -1;
}
