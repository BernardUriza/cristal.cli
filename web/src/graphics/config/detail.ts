export type DetailLevel = 1 | 2 | 3;

export type DetailLod = {
  bandsPx: readonly [number, number, number];
  capByComplexity: readonly DetailLevel[];
};

/** bandsPx are the complexity report's band cuts (<8/<32/<128/≥128 px): band 0 and 1 draw detail 1, band 2 detail 2, band 3 detail 3.
 * capByComplexity[c-1] tops recipe complexity c; every short narration gets complexity 1, so a cap below 3 there strips a foreground jaguar of its pelt. */
export const DETAIL_LOD: DetailLod = {
  bandsPx: [8, 32, 128],
  capByComplexity: [3, 3, 3, 3, 3],
};

export function figureCap(complexity: number): DetailLevel {
  const caps = DETAIL_LOD.capByComplexity;
  return caps[Math.max(0, Math.min(caps.length - 1, Math.round(complexity) - 1))];
}
