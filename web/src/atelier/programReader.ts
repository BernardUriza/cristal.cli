import { ruleById } from "../graphics/domain/grammar/rules.ts";
import type { Archetype, ArchitectureProgram, RuleCall } from "../graphics/domain/grammar/types.ts";
import { ARCHETYPE_RULES, BIG, DEFAULT_ARCHETYPE, DEFAULT_ARCHETYPE_BECAUSE, DEFAULT_BRIDGES, MAX_BRIDGES, SEQUENCES, SMALL, TOWER_NOUNS, type Step } from "./programRules.ts";
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
    else if (big) params[source.key] = range.max;
    else if (small) params[source.key] = range.min;
    else continue;
    because.push(`${step.rule}.${source.key} = ${params[source.key]} (${n !== null ? `contaste ${n}` : `dijiste «${(big ?? small)![0]}»`}, rango ${range.min}–${range.max})`);
  }
  return params;
}

export function readProgram(narration: string, seed: number): ProgramReading {
  const kind = archetypeOf(narration);
  const because = [kind.because];
  const steps = [...SEQUENCES[kind.archetype]];
  if (kind.archetype === "city") {
    const towers = countOf(narration, TOWER_NOUNS);
    const bridges = towers === null ? DEFAULT_BRIDGES : clamp(towers - 1, 1, MAX_BRIDGES);
    while (steps.length < 1 + bridges) steps.push(steps[1]);
    because.push(`${bridges} puentes R4 desde la avenida${towers === null ? "" : ` (contaste ${towers} torres)`}`);
  }
  const rules = steps.map((step) => ({ rule: step.rule, target: step.target, params: paramsOf(step, narration, because) }));
  return { program: { seed, archetype: kind.archetype, rules }, because, matched: kind.matched };
}
