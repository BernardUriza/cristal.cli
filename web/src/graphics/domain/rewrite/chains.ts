import type { RewriteRecord } from "./rewrite.ts";

export type ChainRule = { minVisibleRatio: number; minProjectedPx: (ruleId: string) => number };

/** Every root-to-leaf provenance chain of rewrites, each one a list of records linked by `parent`. */
export function provenanceChains(records: readonly RewriteRecord[]): RewriteRecord[][] {
  const byId = new Map(records.map((r) => [r.id, r]));
  const parents = new Set(records.flatMap((r) => (r.parent ? [r.parent] : [])));
  return records.filter((r) => !parents.has(r.id)).map((leaf) => {
    const chain: RewriteRecord[] = [];
    for (let r: RewriteRecord | undefined = leaf; r && !chain.includes(r); r = r.parent ? byId.get(r.parent) : undefined) chain.unshift(r);
    return chain;
  });
}

/** A verified chain: semantic change at every level, each level visible and over its minimum, at least two rule families. */
export function verifiedChains(records: readonly RewriteRecord[], rule: ChainRule, minLength = 3): RewriteRecord[][] {
  return provenanceChains(records)
    .map((c) => c.filter((r) => r.evidence.semanticChanged && r.evidence.visibleRatio >= rule.minVisibleRatio && r.projectedPx >= rule.minProjectedPx(r.rule)))
    .filter((c) => c.length >= minLength && new Set(c.map((r) => r.rule)).size >= 2 && c.every((r, k) => k === 0 || r.parent === c[k - 1].id));
}
