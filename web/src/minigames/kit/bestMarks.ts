import { readJson, writeJson } from "../../shared/storage.ts";
export type BestMarks = Record<string, number>;

export type BestUpdate = { best: BestMarks; isRecord: boolean; previous: number | null };

export function updateBest(best: BestMarks, key: string, score: number, lowerIsBetter = true): BestUpdate {
  const previous = best[key] ?? null;
  const beaten = previous === null || (lowerIsBetter ? score < previous : score > previous);
  if (!beaten) return { best, isRecord: false, previous };
  return { best: { ...best, [key]: score }, isRecord: true, previous };
}

export function bestMarksStore(storageKey: string): { load: () => BestMarks; save: (best: BestMarks) => void } {
  return {
    load: () => {
      const parsed = readJson(storageKey);
      if (typeof parsed !== "object" || parsed === null || Array.isArray(parsed)) return {};
      const out: BestMarks = {};
      for (const [key, value] of Object.entries(parsed as Record<string, unknown>)) if (typeof value === "number") out[key] = value;
      return out;
    },
    save: (best) => writeJson(storageKey, best),
  };
}
