import { box, type Face, type Solid, type SolidKind } from "../architecture/mass.ts";
import { cross, normalize, sub, type Vec3 } from "../math/vec3.ts";
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

const corners = (r: Rect, y: number): Vec3[] => [[r.x0, y, r.z0], [r.x0, y, r.z1], [r.x1, y, r.z1], [r.x1, y, r.z0]];

/** A truncated pyramid from `bottom` at y0 to `top` at y1: the talud of a stepped body; open on top unless capped. */
export function frustum(p: PlacedSpace, name: string, kind: SolidKind, bottom: Rect, top: Rect, y0: number, y1: number, capped = false): Solid {
  const b = corners(bottom, y0);
  const t = corners(top, y1);
  const faces: Face[] = b.map((_, i) => {
    const j = (i + 1) % 4;
    return { points: [b[i], b[j], t[j], t[i]], normal: normalize(cross(sub(b[j], b[i]), sub(t[j], b[i]))) };
  });
  faces.push({ points: [...b].reverse(), normal: [0, -1, 0] });
  if (capped) faces.push({ points: t, normal: [0, 1, 0] });
  return { id: `${p.node.id}:${name}`, tag: { kind, space: p.node.id }, faces };
}

export const withoutTop = (s: Solid): Solid => ({ ...s, faces: s.faces.filter((f) => f.normal[1] < 0.5) });
