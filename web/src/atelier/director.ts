import type { ConfigInput } from "../graphics/config/types.ts";
import { fnv1a } from "../shared/rng";
import { DEFAULT_ANOMALY, DEFAULT_DENSITY, DIRECTOR_RULES, MAX_COMPLEXITY, WORDS_PER_COMPLEXITY_LEVEL, type Decision } from "./directorRules.ts";

export type Choice = { decision: Decision; because: string; source: "narración" | "defecto" | "humano" };

export type Recipe = {
  title: string;
  narration: string;
  seed: number;
  choices: Choice[];
  renderer: "canvas+svg";
  reference: "ninguna imagen externa";
};

export function seedFromNarration(narration: string): number {
  return (fnv1a(narration.trim().toLowerCase()) % 1_000_000) + 1;
}

function wordCount(text: string): number {
  return text.trim().split(/\s+/).filter(Boolean).length;
}

export function titleFor(narration: string): string {
  const words = narration.trim().split(/\s+/).filter(Boolean).slice(0, 4);
  return words.length > 0 ? words.join(" ") : "sin título";
}

export function direct(narration: string, seed = seedFromNarration(narration)): Recipe {
  const choices: Choice[] = [];
  const decided = new Set<string>();
  for (const rule of DIRECTOR_RULES) {
    if (decided.has(rule.decision.field) || !rule.match.test(narration)) continue;
    decided.add(rule.decision.field);
    choices.push({ decision: rule.decision, because: `${rule.because} (encontré «${narration.match(rule.match)?.[0]}»)`, source: "narración" });
  }
  if (!decided.has("complexity")) {
    const level = Math.max(1, Math.min(MAX_COMPLEXITY, Math.ceil(wordCount(narration) / WORDS_PER_COMPLEXITY_LEVEL)));
    choices.push({ decision: { field: "complexity", value: level }, because: `${wordCount(narration)} palabras: un nivel por cada ${WORDS_PER_COMPLEXITY_LEVEL}`, source: "defecto" });
  }
  if (!decided.has("density")) choices.push({ decision: { field: "density", value: DEFAULT_DENSITY }, because: "no hablaste de lleno ni vacío", source: "defecto" });
  if (!decided.has("anomalyRate")) choices.push({ decision: { field: "anomalyRate", value: DEFAULT_ANOMALY }, because: "no hablaste de orden ni de caos", source: "defecto" });
  if (!decided.has("palette")) choices.push({ decision: { field: "palette", value: "friedeberg" }, because: "no hablaste de luz ni de noche", source: "defecto" });
  return { title: titleFor(narration), narration, seed, choices, renderer: "canvas+svg", reference: "ninguna imagen externa" };
}

export function override(recipe: Recipe, decision: Decision, because: string): Recipe {
  const choices = recipe.choices.filter((c) => c.decision.field !== decision.field);
  return { ...recipe, choices: [...choices, { decision, because, source: "humano" }] };
}

export function reseed(recipe: Recipe, seed: number): Recipe {
  return { ...recipe, seed };
}

export function configFor(recipe: Recipe, width: number, height: number): ConfigInput {
  const input: ConfigInput = { seed: recipe.seed, tech: { width, height, projection: {} } };
  for (const { decision } of recipe.choices) {
    if (decision.field === "projection") input.tech = { ...input.tech, projection: { kind: decision.value } };
    else if (decision.field === "palette") input.palette = decision.value;
    else if (decision.field === "symmetry") input.symmetry = decision.value;
    else input[decision.field] = decision.value;
  }
  return input;
}
