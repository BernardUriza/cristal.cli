import type { SymbolicArchetype } from "./symbolicBus";
import { coerceRoom } from "./RoomContractValidator";
import type { RoomShape } from "./types";

const BASE_URL = import.meta.env.VITE_CRISTAL_LLM_URL ?? "http://localhost:8131";

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

// A hung AI server must degrade to the local fallback, never freeze the descent.
export const GENERATE_ROOM_TIMEOUT_MS = 8000;

export async function generateRoom(params: {
  seed: number;
  archetype: SymbolicArchetype;
  depth: number;
  fragments?: string[];
  timeoutMs?: number;
}): Promise<Room> {
  const timeoutMs = params.timeoutMs ?? GENERATE_ROOM_TIMEOUT_MS;
  const controller = new AbortController();
  let timer: ReturnType<typeof setTimeout> | undefined;
  try {
    const timeout = new Promise<never>((_, reject) => {
      timer = setTimeout(() => {
        controller.abort();
        reject(new Error(`/generate timed out after ${timeoutMs}ms`));
      }, timeoutMs);
    });
    const request = (async () => {
      const res = await fetch(`${BASE_URL}/generate`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          seed: params.seed,
          archetype: params.archetype,
          depth: params.depth,
          fragments: params.fragments ?? [],
        }),
        signal: controller.signal,
      });
      if (!res.ok) {
        throw new Error(`/generate ${res.status}: ${await res.text()}`);
      }
      return coerceRoom(await res.json(), params.seed);
    })();
    return await Promise.race([request, timeout]);
  } catch {
    return localRoom(params);
  } finally {
    if (timer !== undefined) clearTimeout(timer);
  }
}

export function localRoom(params: {
  seed: number;
  archetype: SymbolicArchetype;
  depth: number;
  fragments?: string[];
}): Room {
  const seed = Number.isFinite(params.seed) ? params.seed : 0;
  const rng = mulberry32(seed >>> 0);
  const shape: RoomShape = ["chamber", "corridor", "shaft", "void"][
    Math.floor(rng() * 4)
  ] as RoomShape;
  const nouns = {
    fragment: ["archivo partido", "vidrio", "indice roto"],
    echo: ["eco", "boveda repetida", "pasillo de retorno"],
    corruption: ["cicatriz", "buffer negro", "rotura"],
    memory: ["cajon", "cinta", "foto invertida"],
    moon: ["marea lunar", "ventana falsa", "sombra humeda"],
    gate: ["umbral", "cerradura", "marco sin pared"],
    vision: ["pantalla", "profeta", "camara blanca"],
  } satisfies Record<SymbolicArchetype, string[]>;
  const verbs = ["respira", "miente", "espera", "recuerda", "parpadea"];
  const noun = pick(nouns[params.archetype], rng);
  const verb = pick(verbs, rng);
  const fragment = params.fragments?.[0]?.replace(/\s+/g, " ").slice(0, 56);
  const depth = Math.max(0, params.depth);
  const dread = Math.min(100, 26 + depth * 7 + Math.floor(rng() * 42));
  const exitCount = 2 + Math.floor(rng() * 2);
  const exits = [
    `seguir donde ${noun} ${verb}`,
    "abrir la puerta que evita tu nombre",
    "cruzar el marco tibio",
  ].slice(0, exitCount);

  return coerceRoom(
    {
      name: `${capitalize(params.archetype)} ${Math.abs(seed % 1000).toString().padStart(3, "0")}`,
      inscription: fragment
        ? `lo que dijiste vuelve como ${noun}: ${fragment}`
        : `si no confiesas nada, ${noun} ${verb} por ti`,
      description: `Fallback local: el servidor IA no respondio, pero la semilla ${seed} mantiene un cuarto jugable.`,
      exits,
      dread,
      shape,
      seed,
    },
    seed
  );
}

function pick<T>(items: readonly T[], rng: () => number): T {
  return items[Math.floor(rng() * items.length)]!;
}

function capitalize(value: string): string {
  return value.charAt(0).toUpperCase() + value.slice(1);
}

function mulberry32(seed: number): () => number {
  let t = seed;
  return () => {
    t += 0x6d2b79f5;
    let r = Math.imul(t ^ (t >>> 15), 1 | t);
    r ^= r + Math.imul(r ^ (r >>> 7), 61 | r);
    return ((r ^ (r >>> 14)) >>> 0) / 4294967296;
  };
}
