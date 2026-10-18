import { SCENE_LIMITS } from "../graphics/config/scene.ts";
import { fnv1a, mulberry32 } from "../shared/rng.ts";
import { COLLECTIVE_NOUNS, NUMBER_WORDS, SIZE_WORDS } from "./sceneRules.ts";

export type Counted = { count: number; because?: string };

const clean = (w: string) => w.replace(/[^\p{L}\d]/gu, "");

/** The number said right before the figure; failing that, a collective noun gives a seeded plural; null when nothing was said. */
export function countBefore(text: string, index: number, seed: number, noun: string): Counted | null {
  const before = text.slice(Math.max(0, index - 32), index).toLowerCase().split(/\s+/).map(clean).filter(Boolean);
  for (let i = before.length - 1; i >= Math.max(0, before.length - 3); i--) {
    const w = before[i];
    if (/^\d+$/.test(w)) return { count: Math.min(SCENE_LIMITS.count, Number(w)) };
    if (w in NUMBER_WORDS) return { count: NUMBER_WORDS[w] };
    const c = COLLECTIVE_NOUNS.find((r) => r.match.test(w));
    if (c) {
      const [lo, hi] = c.range;
      const count = lo + Math.floor(mulberry32(fnv1a(`${seed}:${w}:${noun}`))() * (hi - lo + 1));
      return { count, because: `«${w}» sin número: colectivo, ${lo}–${hi} sembrado → ${count}` };
    }
  }
  return null;
}

const nextWord = (text: string, from: number): { word: string; at: number } | null => {
  const m = /^\s+(\p{L}+)/u.exec(text.slice(from));
  return m ? { word: m[1], at: from + m[0].length - m[1].length } : null;
};

/** The size word right after a figure's noun, if any. */
export function sizeAfter(text: string, end: number): { word: string; scale: number; because: string } | null {
  const next = nextWord(text, end);
  const rule = next ? SIZE_WORDS.find((r) => r.match.test(next.word)) : undefined;
  return next && rule ? { word: next.word, scale: rule.scale, because: rule.because } : null;
}

/** Size words that follow a figure noun are blanked, so «jaguar gigante» never summons a separate giant. Indices stay put. */
export function maskSizeWords(text: string, isFigure: (word: string) => boolean): string {
  let out = text;
  for (const m of text.matchAll(/\p{L}+/gu)) {
    const size = isFigure(m[0]) && !SIZE_WORDS.some((r) => r.match.test(m[0])) ? nextWord(text, m.index! + m[0].length) : null;
    if (size && SIZE_WORDS.some((r) => r.match.test(size.word))) out = out.slice(0, size.at) + " ".repeat(size.word.length) + out.slice(size.at + size.word.length);
  }
  return out;
}
