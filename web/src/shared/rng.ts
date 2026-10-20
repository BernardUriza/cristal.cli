export type Rng = () => number;

export const GOLDEN_RATIO_HASH = 0x9e3779b1;

export function mix32(seed: number, salt: number, rounds = 2): number {
  let value = (seed ^ Math.imul(salt, GOLDEN_RATIO_HASH)) >>> 0;
  for (let i = 0; i < rounds; i++) value = Math.imul(value ^ (value >>> 16), 0x45d9f3b) >>> 0;
  return (value ^ (value >>> 16)) >>> 0;
}

export function unitHash(seed: number, salt: number): number {
  return mix32(seed, salt) / 0xffffffff;
}

export function mulberry32(seed: number): Rng {
  let a = seed >>> 0;
  return () => {
    a |= 0;
    a = (a + 0x6d2b79f5) | 0;
    let t = Math.imul(a ^ (a >>> 15), 1 | a);
    t = (t + Math.imul(t ^ (t >>> 7), 61 | t)) ^ t;
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  };
}

export function pick<T>(rng: Rng, items: readonly T[]): T {
  return items[Math.floor(rng() * items.length)];
}

export function chance(rng: Rng, probability: number): boolean {
  return rng() < probability;
}

export function indexBelow(rng: Rng, count: number): number {
  return Math.floor(rng() * count);
}

export function fnv1a(text: string): number {
  let hash = 2166136261;
  for (let i = 0; i < text.length; i++) {
    hash ^= text.charCodeAt(i);
    hash = Math.imul(hash, 16777619);
  }
  return hash >>> 0;
}

export function shuffle<T>(items: readonly T[], rng: Rng): T[] {
  const out = [...items];
  for (let i = out.length - 1; i > 0; i--) {
    const j = Math.floor(rng() * (i + 1));
    [out[i], out[j]] = [out[j], out[i]];
  }
  return out;
}
