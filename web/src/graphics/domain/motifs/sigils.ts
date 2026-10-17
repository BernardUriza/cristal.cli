import { regularPolygon } from "../geometry.ts";
import type { Rng } from "../../../shared/rng";
import { circle, line, polygon, rect, stroked, type Shape } from "../shapes.ts";

export function outlinedPolygon(cx: number, cy: number, r: number, sides: number, stroke: string, sw: number, rot = 0, glow = true): Shape {
  return polygon(regularPolygon(cx, cy, r, sides, rot), stroked(stroke, sw, { glow }));
}

export function flowerOfLife(cx: number, cy: number, r: number, rings: number, stroke: string, sw: number, glow = true): Shape[] {
  const base = r / (rings + 1);
  const out: Shape[] = [circle(cx, cy, base, stroked(stroke, sw, { glow }))];
  for (let ring = 1; ring <= rings; ring++) {
    const count = 6 * ring;
    const ringR = base * ring;
    const opacity = Number((1 - ring * 0.15).toFixed(2));
    for (let i = 0; i < count; i++) {
      const a = (i * 2 * Math.PI) / count + ((ring % 2) * Math.PI) / count;
      out.push(circle(cx + ringR * Math.cos(a), cy + ringR * Math.sin(a), base, stroked(stroke, sw, { opacity })));
    }
  }
  return out;
}

export function glitchPattern(cx: number, cy: number, r: number, rng: Rng, stroke: string, accent: string, complexity: number, chaos: number): Shape[] {
  const out: Shape[] = [];
  const segments = 5 + complexity;
  for (let i = 0; i < segments; i++) {
    const x = cx - r + rng() * r * 2;
    const y = cy - r + rng() * r * 2;
    const w = 10 + rng() * 90;
    const h = 2 + rng() * 16;
    const offset = (rng() - 0.5) * 20 * chaos;
    const color = rng() > 0.5 ? stroke : accent;
    out.push(rect(x + offset, y, w, h, { fill: color, opacity: 0.8 }));
  }
  for (let i = 0; i < 12; i++) {
    const y = cy - r + i * r * 0.17;
    if (rng() < 0.4) out.push(line([cx - r, y], [cx + r, y], stroked(stroke, 1, { opacity: 0.3 })));
  }
  return out;
}
