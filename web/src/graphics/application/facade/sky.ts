import type { Sky } from "../../domain/architecture/types.ts";
import { star } from "../../domain/geometry.ts";
import { concentricRings, sierpinski, sunburst } from "../../domain/motifs/radial.ts";
import type { Rng } from "../../domain/rng.ts";
import { circle, filled, polygon, type Shape } from "../../domain/shapes.ts";
import { ornament, palInks, type Painter } from "../painter.ts";

export function paintSun(p: Painter, sky: Sky, width: number, height: number): Shape[] {
  const { pal } = p;
  const cx = width * sky.sun.u;
  const cy = height * sky.sun.v;
  const R = height * 0.075;
  const ink = palInks(pal, pal.ink, pal.ink, pal.ink);
  return [
    ...sunburst(cx, cy, R, sky.sun.rays, pal.accent, pal.primary, ornament(p, ink, 0.9)),
    circle(cx, cy, R, filled(pal.gold, pal.ink, 1.6)),
    ...concentricRings(cx, cy, R * 0.85, 2, ornament(p, ink, 1)),
    ...sierpinski(cx, cy + R * 0.1, R * 0.5, sky.sun.fractalDepth, pal.secondary, ornament(p, ink, 0.7)),
  ];
}

export function paintStars(p: Painter, sky: Sky, width: number, height: number, rng: Rng): Shape[] {
  const { pal, view } = p;
  const cx = width * sky.sun.u;
  const cy = height * sky.sun.v;
  const golden = Math.PI * (3 - Math.sqrt(5));
  const minR = height * 0.075 * 2.6;
  const spread = height * 0.052;
  const out: Shape[] = [];
  for (let k = 1; k <= sky.stars; k++) {
    const r = minR + spread * Math.sqrt(k);
    const a = k * golden;
    const x = cx + r * Math.cos(a);
    const y = cy + r * Math.sin(a);
    if (y > view.hy - 30 || y < 30 || x < 30 || x > width - 30) continue;
    const size = 4 + rng() * 6;
    out.push(polygon(star(x, y, size, size * 0.38, 4, a), filled(k % 3 === 0 ? pal.primary : pal.accent, pal.ink, 0.7, { join: "round" })));
  }
  return out;
}
