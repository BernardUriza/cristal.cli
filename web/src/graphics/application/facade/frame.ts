import { greca } from "../../domain/motifs/bands.ts";
import { rosette } from "../../domain/motifs/radial.ts";
import { filled, group, rect, type Shape } from "../../domain/shapes.ts";
import { ornament, palInks, type Painter } from "../painter.ts";

const T = 22;

export function paintFrame(p: Painter, width: number, height: number): Shape[] {
  const { pal, art } = p;
  const ink = ornament(p, palInks(pal, pal.primary, pal.secondary, pal.accent), 0.9);
  const out: Shape[] = [];
  if (art.complexity >= 3) {
    const across = Math.round(width / (T * 2));
    const down = Math.round(height / (T * 2));
    out.push(...greca(0, 0, width, T, across, ink));
    out.push(...greca(0, height - T, width, T, across, ink));
    out.push(group([{ rotate: 90 }, { translate: [0, -T] }], greca(0, 0, height, T, down, ink)));
    out.push(group([{ translate: [width, 0] }, { rotate: 90 }], greca(0, 0, height, T, down, ink)));
  } else {
    const colors = [pal.primary, pal.secondary, pal.accent];
    const nx = Math.ceil(width / T);
    const ny = Math.ceil(height / T);
    for (let i = 0; i < nx; i++) {
      out.push(rect(i * T, 0, T, T, filled(colors[i % 3], pal.ink, 0.8)));
      out.push(rect(i * T, height - T, T, T, filled(colors[(i + 1) % 3], pal.ink, 0.8)));
    }
    for (let j = 1; j < ny - 1; j++) {
      out.push(rect(0, j * T, T, T, filled(colors[(j + 2) % 3], pal.ink, 0.8)));
      out.push(rect(width - T, j * T, T, T, filled(colors[j % 3], pal.ink, 0.8)));
    }
  }
  const corners: [number, number][] = [[T * 2.2, T * 2.2], [width - T * 2.2, T * 2.2], [T * 2.2, height - T * 2.2], [width - T * 2.2, height - T * 2.2]];
  for (const [x, y] of corners) out.push(...rosette(x, y, T * 1.7, 8, ornament(p, palInks(pal, pal.gold, pal.primary, pal.secondary), 0.9, art.complexity >= 3 ? 2 : 1)));
  return out;
}
