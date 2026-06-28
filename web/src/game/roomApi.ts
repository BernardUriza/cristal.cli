import type { SymbolicArchetype } from "./symbolicBus";

const BASE_URL = import.meta.env.VITE_CRISTAL_LLM_URL ?? "http://localhost:8131";

export interface Room {
  name: string;
  inscription: string;
  description: string;
  exits: string[];
  dread: number;
  seed: number;
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
  return (await res.json()) as Room;
}
