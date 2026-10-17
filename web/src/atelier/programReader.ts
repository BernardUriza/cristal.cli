import { expandProgram } from "../graphics/domain/grammar/expand.ts";
import { ruleById } from "../graphics/domain/grammar/rules.ts";
import { GrammarError, type Archetype, type ArchitectureProgram, type RuleCall } from "../graphics/domain/grammar/types.ts";
import { ARCHETYPE_RULES, BIG, DEFAULT_ARCHETYPE, DEFAULT_ARCHETYPE_BECAUSE, DEFAULT_BRIDGES, MAX_BRIDGES, SEQUENCES, SMALL, TOWER_NOUNS, VARIANTS, type Step, type Variant } from "./programRules.ts";
import { chooseVariant } from "./programVariant.ts";
import { NUMBER_WORDS } from "./sceneRules.ts";

export type ProgramReading = { program: ArchitectureProgram; because: string[]; matched: boolean };

function archetypeOf(narration: string): { archetype: Archetype; because: string; matched: boolean } {
  let best: { rule: (typeof ARCHETYPE_RULES)[number]; hits: number; first: number; word: string } | undefined;
  for (const rule of ARCHETYPE_RULES) {
    const hits = [...narration.matchAll(rule.match)];
    if (hits.length === 0) continue;
    const first = hits[0].index ?? 0;
    if (!best || hits.length > best.hits || (hits.length === best.hits && first < best.first)) best = { rule, hits: hits.length, first, word: hits[0][0] };
  }
  if (!best) return { archetype: DEFAULT_ARCHETYPE, because: DEFAULT_ARCHETYPE_BECAUSE, matched: false };
  return { archetype: best.rule.archetype, because: `${best.rule.because} (encontré «${best.word}»)`, matched: true };
}

function countOf(narration: string, nouns: RegExp): number | null {
  const words = narration.toLowerCase().split(/\s+/).map((w) => w.replace(/[^\p{L}\d]/gu, ""));
  for (let i = 0; i < words.length; i++) {
    if (!nouns.test(words[i])) continue;
    for (let k = i - 1; k >= Math.max(0, i - 2); k--) {
      if (/^\d+$/.test(words[k])) return Number(words[k]);
      if (words[k] in NUMBER_WORDS && NUMBER_WORDS[words[k]] > 1) return NUMBER_WORDS[words[k]];
    }
  }
  return null;
}

const clamp = (v: number, lo: number, hi: number) => Math.max(lo, Math.min(hi, v));

function paramsOf(step: Step, narration: string, because: string[]): RuleCall["params"] {
  const rule = ruleById(step.rule)!;
  const params: RuleCall["params"] = {};
  for (const source of step.params) {
    const range = rule.params[source.key];
    const n = countOf(narration, source.nouns);
    const big = BIG.exec(narration);
    const small = SMALL.exec(narration);
    if (n !== null) params[source.key] = clamp(n, range.min, range.max);
    else if (source.countOnly) continue;
    else if (big) params[source.key] = range.max;
    else if (small) params[source.key] = range.min;
    else continue;
    because.push(`${step.rule}.${source.key} = ${params[source.key]} (${n !== null ? `contaste ${n}` : `dijiste «${(big ?? small)![0]}»`}, rango ${range.min}–${range.max})`);
  }
  return params;
}

function stepsOf(variant: Variant | undefined, archetype: Archetype, narration: string, because: string[]): Step[] {
  const steps = [...(variant?.steps ?? SEQUENCES[archetype])];
  if (!variant?.bridges) return steps;
  const towers = countOf(narration, TOWER_NOUNS);
  const bridges = towers === null ? DEFAULT_BRIDGES : clamp(towers - 1, 1, MAX_BRIDGES);
  while (steps.length < 1 + bridges) steps.push(steps[1]);
  because.push(`${bridges} puentes R4 desde la avenida${towers === null ? "" : ` (contaste ${towers} torres)`}`);
  return steps;
}

function programOf(variant: Variant | undefined, archetype: Archetype, narration: string, seed: number, because: string[]): ArchitectureProgram {
  const rules = stepsOf(variant, archetype, narration, because).map((step) => ({ rule: step.rule, target: step.target, params: paramsOf(step, narration, because) }));
  return { seed, archetype, rules };
}

/** The archetype's variant under words and seed; if its topology goal fails on the final graph, the first (classic) variant, said out loud. */
export function readProgram(narration: string, seed: number): ProgramReading {
  const kind = archetypeOf(narration);
  const because = [kind.because];
  const variants = VARIANTS[kind.archetype];
  const choice = variants ? chooseVariant(variants, narration, seed) : undefined;
  if (choice) because.push(choice.because);
  const program = programOf(choice?.variant, kind.archetype, narration, seed, because);
  try {
    expandProgram(program);
    return { program, because, matched: kind.matched };
  } catch (err) {
    if (!(err instanceof GrammarError) || err.code !== "topology-goal" || !variants) throw err;
    because.push(`fallback: ${choice!.variant.id} no cumplió su meta topológica sobre el grafo final (${err.message}); dibujé ${variants[0].id}`);
    return { program: programOf(variants[0], kind.archetype, narration, seed, because), because, matched: kind.matched };
  }
}
