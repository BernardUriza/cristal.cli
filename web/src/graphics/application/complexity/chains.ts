import { rewriteFamily, type RewriteVerification } from "../../config/complexity.ts";
import type { RewriteComplexity, RewriteEvidence } from "./types.ts";

/** A level counts only if it changes what the piece IS, really takes its place, and stays visible at a readable size; nesting, links and ornament never do. */
export function isVerified(e: RewriteEvidence, v: RewriteVerification): boolean {
  return e.relation === "rewrites" && e.semanticChanged && e.replacedRatio >= v.minReplacedRatio && e.visibleRatio >= v.minVisibleRatio && e.projectedAreaPx >= v.minProjectedAreaPx;
}

/** The verified run that ends at `e`, walking parent ids up while each ancestor is verified too. */
function runTo(e: RewriteEvidence, byId: Map<string, RewriteEvidence>, ok: Set<string>): RewriteEvidence[] {
  const run = [e];
  for (let p = e.parentId; p !== null && ok.has(p) && run.length <= byId.size; p = byId.get(p)!.parentId) run.push(byId.get(p)!);
  return run;
}

const depthOf = (run: readonly RewriteEvidence[], v: RewriteVerification) => (new Set(run.map((x) => rewriteFamily(x.ruleId))).size >= Math.min(v.minFamilies, run.length) ? run.length : 1);

/** Longest verified chain (one level alone counts 1; a longer one needs distinct families) and how many verified chains reach the configured depth. */
export function rewriteComplexity(evidence: readonly RewriteEvidence[], v: RewriteVerification): RewriteComplexity {
  const byId = new Map<string, RewriteEvidence>();
  for (const e of evidence) if (!byId.has(e.replacementId)) byId.set(e.replacementId, e);
  const ok = new Set([...byId.values()].filter((e) => isVerified(e, v)).map((e) => e.replacementId));
  const hasChild = new Set([...ok].map((id) => byId.get(id)!.parentId).filter((p): p is string => p !== null && ok.has(p)));
  let maxVerifiedDepth = 0, visibleChainsDepth3 = 0;
  for (const id of ok) {
    const d = depthOf(runTo(byId.get(id)!, byId, ok), v);
    maxVerifiedDepth = Math.max(maxVerifiedDepth, d);
    if (!hasChild.has(id) && d >= v.chainDepth) visibleChainsDepth3++;
  }
  return { maxVerifiedDepth, visibleChainsDepth3, verified: ok.size, recorded: byId.size };
}
