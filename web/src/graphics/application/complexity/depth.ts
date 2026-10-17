import type { RewriteEntry } from "./types.ts";

function isRewrite(entry: RewriteEntry): boolean {
  return entry.operation === "rewrite" || entry.params?.operation === "rewrite";
}

function declaredDepth(entry: RewriteEntry): number {
  const raw = entry.depth ?? entry.params?.depth;
  const value = typeof raw === "string" ? Number(raw) : raw;
  return typeof value === "number" && Number.isFinite(value) ? value : 1;
}

function chainLength(id: string, parents: Map<string, string | undefined>, seen: Set<string>): number {
  const parent = parents.get(id);
  if (parent === undefined || !parents.has(parent) || seen.has(parent)) return 1;
  seen.add(parent);
  return 1 + chainLength(parent, parents, seen);
}

function withNested(entries: readonly RewriteEntry[]): RewriteEntry[] {
  return entries.flatMap((e) => [e, ...withNested(e.rewrites ?? [])]);
}

export function semanticDepth(entries: readonly RewriteEntry[]): number {
  const rewrites = withNested(entries).filter(isRewrite);
  const parents = new Map<string, string | undefined>();
  for (const r of rewrites) if (r.id !== undefined) parents.set(r.id, r.parent);
  let best = 0;
  for (const r of rewrites) {
    const chained = r.id !== undefined ? chainLength(r.id, parents, new Set([r.id])) : 1;
    best = Math.max(best, declaredDepth(r), chained);
  }
  return best;
}
