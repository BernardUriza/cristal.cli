import type { Bounds } from "../../domain/bezier.ts";
import type { Box3, Vec3 } from "../../domain/math/vec3.ts";
import type { Shape } from "../../domain/shapes.ts";

export type SceneItem = { id: string; kind: "solid" | "figure"; box: Box3; screen: Bounds; depth: number; shapes: Shape[] };

const EPS = 1e-6;

export function screenOverlap(a: Bounds, b: Bounds): boolean {
  return a.minX < b.maxX && b.minX < a.maxX && a.minY < b.maxY && b.minY < a.maxY;
}

/** +1 when `a` is nearer the camera than `b` (painted after), −1 when farther, 0 when no axis plane separates their boxes. */
export function precedence(a: SceneItem, b: SceneItem, forward: Vec3): number {
  let best = -Infinity;
  let vote = 0;
  for (let k = 0; k < 3; k++) {
    const f = forward[k];
    if (Math.abs(f) < EPS) continue;
    const aLow = b.box.min[k] - a.box.max[k];
    const aHigh = a.box.min[k] - b.box.max[k];
    const gap = Math.max(aLow, aHigh);
    if (gap < -EPS || gap * Math.abs(f) <= best) continue;
    best = gap * Math.abs(f);
    vote = (aLow >= aHigh) === f > 0 ? 1 : -1;
  }
  return vote;
}

function inFront(a: SceneItem, b: SceneItem, forward: Vec3): boolean {
  if (!screenOverlap(a.screen, b.screen)) return false;
  const p = precedence(a, b, forward);
  return p === 0 ? a.depth < b.depth : p > 0;
}

/** Precedence graph over the items whose screen boxes overlap, then Kahn's order taking the farthest ready item first; a cycle is cut at its farthest item. */
export function paintOrder(items: readonly SceneItem[], forward: Vec3): SceneItem[] {
  const n = items.length;
  const after: number[][] = items.map(() => []);
  const blockers = new Array<number>(n).fill(0);
  for (let i = 0; i < n; i++) {
    for (let j = i + 1; j < n; j++) {
      if (!screenOverlap(items[i].screen, items[j].screen)) continue;
      const p = precedence(items[i], items[j], forward) || (items[i].depth > items[j].depth ? -1 : 1);
      const [back, front] = p > 0 ? [j, i] : [i, j];
      after[back].push(front);
      blockers[front]++;
    }
  }
  const done = new Array<boolean>(n).fill(false);
  const out: SceneItem[] = [];
  while (out.length < n) {
    let pick = -1;
    for (let i = 0; i < n; i++) if (!done[i] && blockers[i] === 0 && (pick < 0 || items[i].depth > items[pick].depth)) pick = i;
    if (pick < 0) for (let i = 0; i < n; i++) if (!done[i] && (pick < 0 || items[i].depth > items[pick].depth)) pick = i;
    done[pick] = true;
    out.push(items[pick]);
    for (const k of after[pick]) blockers[k]--;
  }
  return out;
}

/** Every solid that stands in front of a figure, and every solid in front of those: they must be painted after the figures. */
export function occluders(solids: readonly SceneItem[], figures: readonly SceneItem[], forward: Vec3): Set<string> {
  const front = new Set<string>();
  const queue = [...figures];
  while (queue.length) {
    const q = queue.pop()!;
    for (const s of solids) {
      if (front.has(s.id)) continue;
      const ahead = q.kind === "figure" ? inFront(s, q, forward) : screenOverlap(s.screen, q.screen) && precedence(s, q, forward) > 0;
      if (!ahead) continue;
      front.add(s.id);
      queue.push(s);
    }
  }
  return front;
}
