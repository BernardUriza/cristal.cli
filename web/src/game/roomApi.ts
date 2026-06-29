import type { SymbolicArchetype } from "./symbolicBus";
import type { RoomShape } from "./types";

const BASE_URL = import.meta.env.VITE_CRISTAL_LLM_URL ?? "http://localhost:8131";

const SHAPES: RoomShape[] = ["chamber", "corridor", "shaft", "void"];

// The prophet may omit or mangle the shape; fall back deterministically so a
// given seed always renders the same geometry even when the model misbehaves.
function normalizeShape(value: unknown, seed: number): RoomShape {
  if (typeof value === "string" && SHAPES.includes(value as RoomShape)) {
    return value as RoomShape;
  }
  return SHAPES[seed % SHAPES.length];
}

export interface Room {
  name: string;
  inscription: string;
  description: string;
  exits: string[];
  dread: number;
  shape: RoomShape;
  seed: number;
}

// Deterministic child seed for an exit: mixing the parent seed with the exit
// index means door N of a given room always leads to the same next room, so the
// backrooms graph is stable across reloads and cacheable by seed.
export function seedForExit(parentSeed: number, index: number): number {
  let a = (parentSeed ^ ((index + 1) * 0x9e3779b1)) >>> 0;
  a = Math.imul(a ^ (a >>> 16), 0x45d9f3b) >>> 0;
  a = Math.imul(a ^ (a >>> 16), 0x45d9f3b) >>> 0;
  return (a ^ (a >>> 16)) >>> 0;
}

export async function generateRoom(params: {
  seed: number;
  archetype: SymbolicArchetype;
  depth: number;
  fragments?: string[];
}): Promise<Room> {
  const res = await fetch(`${BASE_URL}/generate`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({
      seed: params.seed,
      archetype: params.archetype,
      depth: params.depth,
      fragments: params.fragments ?? [],
    }),
  });
  if (!res.ok) {
    throw new Error(`/generate ${res.status}: ${await res.text()}`);
  }
  const data = (await res.json()) as Room;
  return { ...data, shape: normalizeShape(data.shape, data.seed ?? params.seed) };
}
