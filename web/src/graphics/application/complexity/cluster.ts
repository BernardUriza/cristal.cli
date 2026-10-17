/** Complete-linkage agglomeration: merges the closest pair while every member of both lies within `threshold`; labels are first-member order. */
export function completeLinkage(n: number, distance: (i: number, j: number) => number, threshold: number): number[] {
  const d = Array.from({ length: n }, (_, i) => Array.from({ length: n }, (_, j) => (i === j ? 0 : distance(i, j))));
  const alive = new Array<boolean>(n).fill(true);
  const members = Array.from({ length: n }, (_, i) => [i]);
  for (;;) {
    let bi = -1, bj = -1, best = Infinity;
    for (let i = 0; i < n; i++) {
      if (!alive[i]) continue;
      for (let j = i + 1; j < n; j++) if (alive[j] && d[i][j] < best) { best = d[i][j]; bi = i; bj = j; }
    }
    if (bi < 0 || best >= threshold) break;
    alive[bj] = false;
    members[bi].push(...members[bj]);
    for (let k = 0; k < n; k++) if (alive[k] && k !== bi) d[bi][k] = d[k][bi] = Math.max(d[bi][k], d[bj][k]);
  }
  const labels = new Array<number>(n).fill(-1);
  let next = 0;
  for (let i = 0; i < n; i++) if (alive[i]) { for (const m of members[i]) labels[m] = next; next++; }
  return labels;
}

/** Shannon effective number of clusters, exp(−Σ pᵢ ln pᵢ). */
export function effectiveDiversity(labels: readonly number[]): number {
  if (labels.length === 0) return 0;
  const counts = new Map<number, number>();
  for (const l of labels) counts.set(l, (counts.get(l) ?? 0) + 1);
  let h = 0;
  for (const c of counts.values()) { const p = c / labels.length; h -= p * Math.log(p); }
  return Math.exp(h);
}
