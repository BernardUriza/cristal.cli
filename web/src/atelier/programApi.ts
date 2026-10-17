import { expandProgram } from "../graphics/domain/grammar/expand.ts";
import { GrammarError, type ArchitectureProgram, type RuleCall } from "../graphics/domain/grammar/types.ts";

export const MAX_RULE_CALLS = 8;

function callOf(raw: unknown): RuleCall | null {
  if (typeof raw !== "object" || raw === null) return null;
  const { rule, target, params } = raw as Record<string, unknown>;
  if (typeof rule !== "string" || typeof target !== "string") return null;
  if (params !== undefined && (typeof params !== "object" || params === null || Array.isArray(params))) return null;
  const kept: RuleCall["params"] = {};
  for (const [k, v] of Object.entries((params ?? {}) as Record<string, unknown>)) {
    if (typeof v !== "number" && typeof v !== "string") return null;
    kept[k] = v;
  }
  return { rule, target, params: kept };
}

/** Pedro's program is taken whole or not at all: the grammar's own validator expands it under the seed, and any GrammarError discards it. */
export function parseProgram(value: unknown, seed: number): ArchitectureProgram | null {
  if (typeof value !== "object" || value === null) return null;
  const { archetype, rules } = value as Record<string, unknown>;
  if (typeof archetype !== "string" || !Array.isArray(rules) || rules.length > MAX_RULE_CALLS) return null;
  const calls = rules.map(callOf);
  if (calls.some((c) => c === null)) return null;
  const program = { seed, archetype, rules: calls as RuleCall[] } as ArchitectureProgram;
  try {
    expandProgram(program);
    return program;
  } catch (err) {
    if (err instanceof GrammarError) return null;
    throw err;
  }
}
