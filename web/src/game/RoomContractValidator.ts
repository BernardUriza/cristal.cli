import type { Room } from "./roomApi";
import type { RoomShape } from "./types";

export const ROOM_SHAPES: readonly RoomShape[] = ["chamber", "corridor", "shaft", "void"];

function isRecord(value: unknown): value is Record<string, unknown> {
  return typeof value === "object" && value !== null && !Array.isArray(value);
}

function fallbackShape(seed: number): RoomShape {
  const index = Math.abs(Math.trunc(seed)) % ROOM_SHAPES.length;
  return ROOM_SHAPES[index];
}

function isRoomShape(value: unknown): value is RoomShape {
  return typeof value === "string" && ROOM_SHAPES.includes(value as RoomShape);
}

function coerceString(value: unknown): string {
  return typeof value === "string" ? value : "";
}

function coerceFiniteNumber(value: unknown, fallback: number): number {
  return typeof value === "number" && Number.isFinite(value) ? value : fallback;
}

function clamp(value: number, min: number, max: number): number {
  return Math.min(max, Math.max(min, value));
}

function placeholderName(seed: number): string {
  return `Room ${Math.abs(Math.trunc(seed))}`;
}

export function coerceRoom(raw: unknown, fallbackSeed: number): Room {
  const source = isRecord(raw) ? raw : {};
  const validFallbackSeed = Number.isFinite(fallbackSeed) ? fallbackSeed : 0;
  const seed = coerceFiniteNumber(source.seed, validFallbackSeed);
  const name = coerceString(source.name) || coerceString(source.title) || placeholderName(seed);
  const dread = clamp(coerceFiniteNumber(source.dread, 0), 0, 100);
  const exits = Array.isArray(source.exits)
    ? source.exits.filter((exit): exit is string => typeof exit === "string")
    : [];

  return {
    name,
    inscription: coerceString(source.inscription),
    description: coerceString(source.description),
    exits,
    dread,
    shape: isRoomShape(source.shape) ? source.shape : fallbackShape(seed),
    seed,
  };
}

export function isWellFormedRoom(raw: unknown): raw is Room {
  if (!isRecord(raw)) {
    return false;
  }

  return (
    typeof raw.name === "string" &&
    typeof raw.inscription === "string" &&
    typeof raw.description === "string" &&
    Array.isArray(raw.exits) &&
    raw.exits.every((exit) => typeof exit === "string") &&
    typeof raw.dread === "number" &&
    Number.isFinite(raw.dread) &&
    raw.dread >= 0 &&
    raw.dread <= 100 &&
    isRoomShape(raw.shape) &&
    typeof raw.seed === "number" &&
    Number.isFinite(raw.seed)
  );
}
