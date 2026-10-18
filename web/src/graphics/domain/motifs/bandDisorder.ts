import type { Shape } from "../shapes.ts";
import { disorderParams, interrupt, type DisorderInput, type RepeatedItem } from "./disorder.ts";

export type BandDrawing = { shapes: Shape[]; params: Record<string, number | string> };

const bareChildren = (s: Shape): Shape[] | null => (s.kind === "group" && s.transform.length === 0 && !s.clip ? s.children : null);

function flatten(shapes: readonly Shape[]): Shape[] {
  return shapes.flatMap((s): Shape[] => {
    const own = bareChildren(s);
    if (own) return own;
    const inner = s.kind === "group" && s.children.length === 1 ? bareChildren(s.children[0]) : null;
    return inner && s.kind === "group" ? [{ ...s, children: inner }] : [s];
  });
}

/** Runs the cells through Molnár's interruptions; with none chosen the band keeps its undisturbed drawing. */
export function cutCells(prefix: string, items: readonly RepeatedItem[], undisturbed: () => Shape[], disorder: DisorderInput | undefined, unit: number): BandDrawing {
  const base = { [`${prefix}Cells`]: items.length };
  if (!disorder) return { shapes: undisturbed(), params: base };
  const result = interrupt(items, disorder.rng, disorder.policy, unit);
  const shapes = result.interrupted.length > 0 ? flatten(result.shapes) : undisturbed();
  return { shapes, params: { ...base, ...disorderParams(prefix, result.interrupted) } };
}
