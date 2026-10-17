import { box, type Solid, type SolidKind } from "../architecture/mass.ts";
import type { Rect } from "../architecture/layout.ts";
import { KIND_DIMENSIONS, LAYOUT_RULES } from "./dimensions.ts";
import type { PlacedSpace } from "./layout.ts";

export const grow = (r: Rect, m: number): Rect => ({ x0: r.x0 - m, z0: r.z0 - m, x1: r.x1 + m, z1: r.z1 + m });

export function part(p: PlacedSpace, name: string, kind: SolidKind, r: Rect, y0: number, y1: number): Solid {
  return box(`${p.node.id}:${name}`, { kind, space: p.node.id }, r, y0, y1);
}

export function walled(p: PlacedSpace): Solid[] {
  const slab = KIND_DIMENSIONS[p.node.kind].slab;
  return [part(p, "body", "wall", p.rect, p.y0, p.y1 - slab), part(p, "roof", "roof", grow(p.rect, 0.15), p.y1 - slab, p.y1)];
}

export function pillarsAlong(p: PlacedSpace, r: Rect, y0: number, y1: number, prefix: string): Solid[] {
  const { pillar, pillarSpacing } = LAYOUT_RULES;
  const alongX = r.x1 - r.x0 >= r.z1 - r.z0;
  const length = alongX ? r.x1 - r.x0 : r.z1 - r.z0;
  const n = Math.max(2, Math.round(length / pillarSpacing) + 1);
  const out: Solid[] = [];
  for (let i = 0; i < n; i++) {
    const t = pillar / 2 + ((length - pillar) * i) / (n - 1);
    for (const [k, edge] of (alongX ? [r.z0, r.z1 - pillar] : [r.x0, r.x1 - pillar]).entries()) {
      const pr: Rect = alongX ? { x0: r.x0 + t - pillar / 2, x1: r.x0 + t + pillar / 2, z0: edge, z1: edge + pillar } : { x0: edge, x1: edge + pillar, z0: r.z0 + t - pillar / 2, z1: r.z0 + t + pillar / 2 };
      out.push(part(p, `${prefix}${k}-${i}`, "wall", pr, y0, y1));
    }
  }
  return out;
}

/** The four strips of a rectangle's border of width m, leaving its middle open. */
export function frameStrips(r: Rect, m: number): Rect[] {
  return [
    { ...r, z1: r.z0 + m },
    { ...r, z0: r.z1 - m },
    { x0: r.x0, x1: r.x0 + m, z0: r.z0 + m, z1: r.z1 - m },
    { x0: r.x1 - m, x1: r.x1, z0: r.z0 + m, z1: r.z1 - m },
  ];
}
