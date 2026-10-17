import type { ConfigInput } from "../graphics/config/types.ts";
import { fnv1a } from "../shared/rng";
import { DEFAULT_ANOMALY, DEFAULT_DENSITY, DEFAULT_ORNAMENT, DIRECTOR_RULES, MAX_COMPLEXITY, MOTIF_RULES, ORNAMENT_RULES, WORDS_PER_COMPLEXITY_LEVEL, type Decision } from "./directorRules.ts";
import { MAX_LANGUAGES, MAX_MOTIFS, type Anomaly, type Composition, type MotifName, type OrnamentLanguage } from "./vocabulary.ts";

export type ChoiceSource = "narración" | "defecto" | "humano" | "pedro";

export type Choice = { decision: Decision; because: string; source: ChoiceSource };

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
  if (!decided.has("composition")) choices.push({ decision: { field: "composition", value: "patio" }, because: "sin un templo nombrado, el estudio arranca por el patio: la planta primero", source: "defecto" });
  if (!decided.has("anomaly")) choices.push({ decision: { field: "anomaly", value: "none" }, because: "no pediste nada imposible todavía", source: "defecto" });
  const motifs = matchedList(narration, MOTIF_RULES.map((r) => ({ match: r.match, value: r.motif, because: r.because })), MAX_MOTIFS);
  choices.push(
    motifs.values.length > 0
      ? { decision: { field: "motifs", value: motifs.values }, because: motifs.because.join("; "), source: "narración" }
      : { decision: { field: "motifs", value: [] }, because: "no nombraste ninguna figura de la pared", source: "defecto" },
  );
  const ornament = matchedList(narration, ORNAMENT_RULES.map((r) => ({ match: r.match, value: r.language, because: r.because })), MAX_LANGUAGES);
  choices.push(
    ornament.values.length > 0
      ? { decision: { field: "ornament", value: ornament.values }, because: ornament.because.join("; "), source: "narración" }
      : { decision: { field: "ornament", value: DEFAULT_ORNAMENT }, because: "sin lenguaje pedido: greca en muros y ajedrez en el suelo", source: "defecto" },
  );
  return { title: titleFor(narration), narration, seed, choices, renderer: "canvas+svg", reference: "ninguna imagen externa" };
}

function matchedList<T extends string>(narration: string, rules: { match: RegExp; value: T; because: string }[], max: number): { values: T[]; because: string[] } {
  const values: T[] = [];
  const because: string[] = [];
  for (const rule of rules) {
    if (values.length === max || values.includes(rule.value) || !rule.match.test(narration)) continue;
    values.push(rule.value);
    because.push(`${rule.because} (encontré «${narration.match(rule.match)?.[0]}»)`);
  }
  return { values, because };
}

export type Plan = {
  composition: Composition;
  motifs: MotifName[];
  ornament: OrnamentLanguage[];
  anomaly: Anomaly;
  palette: "friedeberg" | "noche";
  density: number;
  complexity: number;
  anomalyRate: number;
  symmetry: "bilateral" | "asymmetric";
  projection: "perspective" | "elevation";
  columns: number | null;
};

export function planOf(recipe: Recipe): Plan {
  const plan: Plan = { composition: "patio", motifs: [], ornament: DEFAULT_ORNAMENT, anomaly: "none", palette: "friedeberg", density: 0.6, complexity: 3, anomalyRate: 0.4, symmetry: "bilateral", projection: "perspective", columns: null };
  for (const { decision } of recipe.choices) {
    if (decision.field === "composition") plan.composition = decision.value;
    else if (decision.field === "motifs") plan.motifs = decision.value;
    else if (decision.field === "ornament") plan.ornament = decision.value;
    else if (decision.field === "anomaly") plan.anomaly = decision.value;
    else if (decision.field === "palette") plan.palette = decision.value;
    else if (decision.field === "symmetry") plan.symmetry = decision.value;
    else if (decision.field === "projection") plan.projection = decision.value;
    else plan[decision.field] = decision.value;
  }
  return plan;
}

export function override(recipe: Recipe, decision: Decision, because: string): Recipe {
  const choices = recipe.choices.filter((c) => c.decision.field !== decision.field);
  return { ...recipe, choices: [...choices, { decision, because, source: "humano" }] };
}

export function reseed(recipe: Recipe, seed: number): Recipe {
  return { ...recipe, seed };
}

export function configFor(recipe: Recipe, width: number, height: number): ConfigInput {
  const plan = planOf(recipe);
  return {
    seed: recipe.seed,
    palette: plan.palette,
    symmetry: plan.symmetry,
    density: plan.density,
    complexity: plan.complexity,
    anomalyRate: plan.anomalyRate,
    columns: plan.columns,
    tech: { width, height, projection: { kind: plan.projection } },
  };
}

export type Direction = { title: string; choices: Choice[] };

export function withDirection(recipe: Recipe, direction: Direction): Recipe {
  const directed = new Set(direction.choices.map((c) => c.decision.field));
  const kept = recipe.choices.filter((c) => c.source === "humano" || !directed.has(c.decision.field));
  const human = new Set(kept.filter((c) => c.source === "humano").map((c) => c.decision.field));
  return { ...recipe, title: direction.title, choices: [...kept, ...direction.choices.filter((c) => !human.has(c.decision.field))] };
}
