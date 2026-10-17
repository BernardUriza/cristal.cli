import { mulberry32 } from "../shared/rng.ts";
import { VARIANT_SALT, WORD_WEIGHT, type Variant } from "./programRules.ts";

export type VariantChoice = { variant: Variant; because: string };

/** Each variant weighs 1 plus WORD_WEIGHT per word of its own in the narration; the seed draws among them, so words tilt the choice without freezing it. */
export function chooseVariant(variants: readonly Variant[], narration: string, seed: number): VariantChoice {
  const scored = variants.map((variant) => {
    const hits = [...narration.matchAll(variant.words)];
    return { variant, weight: 1 + WORD_WEIGHT * hits.length, word: hits.length ? hits[0][0] : null };
  });
  const total = scored.reduce((s, x) => s + x.weight, 0);
  let r = mulberry32((seed ^ VARIANT_SALT) >>> 0)() * total;
  const chosen = scored.find((x) => (r -= x.weight) < 0) ?? scored[scored.length - 1];
  const strongest = [...scored].sort((a, b) => b.weight - a.weight)[0];
  const why = chosen.word ? `encontré «${chosen.word}»` : strongest.word ? `la semilla ${seed} la eligió aunque tus palabras pesaban más hacia ${strongest.variant.id}` : `la semilla ${seed} la eligió`;
  return { variant: chosen.variant, because: `${chosen.variant.because} — ${why} (peso ${chosen.weight} de ${total})` };
}
