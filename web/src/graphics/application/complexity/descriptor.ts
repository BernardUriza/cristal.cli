import type { SilhouetteWeights } from "../../config/complexity.ts";
import type { Vec2 } from "../../domain/shapes.ts";
import { polygonArea } from "../../domain/bezier.ts";
import type { MaskShape } from "./masks.ts";
import { clamp } from "../../../shared/math.ts";

export type ShapeDescriptor = { fourier: number[]; aspect: number; concavity: number };

function cross(o: Vec2, a: Vec2, b: Vec2): number {
  return (a[0] - o[0]) * (b[1] - o[1]) - (a[1] - o[1]) * (b[0] - o[0]);
}

export function convexHull(points: readonly Vec2[]): Vec2[] {
  const sorted = [...points].sort((a, b) => a[0] - b[0] || a[1] - b[1]);
  const half = (pts: Vec2[]) => pts.reduce<Vec2[]>((h, p) => {
    while (h.length >= 2 && cross(h[h.length - 2], h[h.length - 1], p) <= 0) h.pop();
    h.push(p);
    return h;
  }, []);
  return [...half(sorted).slice(0, -1), ...half([...sorted].reverse()).slice(0, -1)];
}

/** The visible mask's radial envelope around its centroid, in screen pixels. */
export function envelope(m: MaskShape): Vec2[] {
  const bins = m.radial.length;
  return m.radial.map((r, b) => {
    const a = ((b + 0.5) / bins) * Math.PI * 2;
    return [m.centroid[0] + r * Math.cos(a), m.centroid[1] + r * Math.sin(a)] as Vec2;
  });
}

/** Low-frequency Fourier magnitudes of the radius scaled by √area (proportions kept), log aspect and 1 − area/hull. */
export function describe(m: MaskShape, harmonics: number): ShapeDescriptor {
  const scale = Math.sqrt(Math.max(m.areaPx, 1e-9));
  const bins = m.radial.length;
  const fourier = Array.from({ length: harmonics + 1 }, (_, k) => {
    let re = 0, im = 0;
    m.radial.forEach((r, j) => { re += (r / scale) * Math.cos((2 * Math.PI * j * k) / bins); im -= (r / scale) * Math.sin((2 * Math.PI * j * k) / bins); });
    return Math.hypot(re, im) / bins;
  });
  const hull = polygonArea(convexHull(envelope(m)));
  const concavity = hull > 0 ? clamp(1 - m.areaPx / hull, 0, 1) : 0;
  return { fourier, aspect: Math.log(Math.max(m.height, 1) / Math.max(m.width, 1)), concavity };
}

export function descriptorDistance(a: ShapeDescriptor, b: ShapeDescriptor, w: SilhouetteWeights): number {
  let sum = 0;
  for (let k = 0; k < a.fourier.length; k++) sum += (w.fourier * (a.fourier[k] - b.fourier[k])) ** 2;
  return Math.sqrt(sum + (w.aspect * (a.aspect - b.aspect)) ** 2 + (w.concavity * (a.concavity - b.concavity)) ** 2);
}
