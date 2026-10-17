import { shuffle, type Rng } from "../../../shared/rng.ts";
import { group, type Shape, type Vec2 } from "../shapes.ts";

export type Interruption = "rotate" | "omit" | "shift";

export type DisorderPolicy = { fraction: number; kinds: readonly Interruption[]; maxRotateDeg: number; maxShiftUnits: number };

export type Interrupted = { index: number; kind: Interruption; amount: number };

export type RepeatedItem = { shape: Shape; pivot: Vec2 };

export type DisorderResult = { shapes: Shape[]; interrupted: Interrupted[] };

export function interruptionCount(count: number, fraction: number): number {
  return Math.min(count, Math.round(count * fraction));
}

export function chooseInterruptions(count: number, rng: Rng, policy: DisorderPolicy, unit = 1): Interrupted[] {
  const k = interruptionCount(count, policy.fraction);
  const chosen = shuffle(Array.from({ length: count }, (_, i) => i), rng).slice(0, k).sort((x, y) => x - y);
  return chosen.map((index) => {
    const kind = policy.kinds[Math.floor(rng() * policy.kinds.length)];
    const sign = rng() < 0.5 ? -1 : 1;
    const limit = kind === "rotate" ? policy.maxRotateDeg : kind === "shift" ? policy.maxShiftUnits * unit : 0;
    return { index, kind, amount: Number((sign * limit * (0.5 + rng() * 0.5)).toFixed(2)) };
  });
}

function interruptOne(item: RepeatedItem, cut: Interrupted): Shape | null {
  if (cut.kind === "omit") return null;
  if (cut.kind === "shift") return group([{ translate: [0, cut.amount] }], [item.shape]);
  const [px, py] = item.pivot;
  return group([{ translate: [px, py] }, { rotate: cut.amount }, { translate: [-px, -py] }], [item.shape]);
}

export function interrupt(items: readonly RepeatedItem[], rng: Rng, policy: DisorderPolicy, unit = 1): DisorderResult {
  const interrupted = chooseInterruptions(items.length, rng, policy, unit);
  const byIndex = new Map(interrupted.map((c) => [c.index, c]));
  const shapes: Shape[] = [];
  items.forEach((item, i) => {
    const cut = byIndex.get(i);
    const s = cut ? interruptOne(item, cut) : item.shape;
    if (s) shapes.push(s);
  });
  return { shapes, interrupted };
}

export function disorderParams(prefix: string, interrupted: readonly Interrupted[]): Record<string, number | string> {
  return {
    [`${prefix}Interrupted`]: interrupted.length,
    [`${prefix}InterruptedAt`]: interrupted.map((c) => `${c.index}:${c.kind}`).join(",") || "none",
  };
}
