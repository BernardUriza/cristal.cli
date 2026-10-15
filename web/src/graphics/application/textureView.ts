import type { Palette } from "../config/palettes.ts";
import type { ArtConfig } from "../config/types.ts";
import { makeLod, type LodConfig } from "../domain/lod.ts";
import type { Painter } from "./painter.ts";
import type { View } from "./projection.ts";

export type TextureFrame = { xMin: number; xMax: number; yMin: number; yMax: number; pxPerMeter: number };

export function frameSize(frame: TextureFrame): { width: number; height: number } {
  return { width: Math.max(1, Math.round((frame.xMax - frame.xMin) * frame.pxPerMeter)), height: Math.max(1, Math.round((frame.yMax - frame.yMin) * frame.pxPerMeter)) };
}

export function textureView(frame: TextureFrame): View {
  const s = frame.pxPerMeter;
  const cx = -frame.xMin * s;
  const hy = frame.yMax * s;
  return { cx, hy, f: s, camH: 0, scaleAt: () => s, project: (x, y) => [cx + x * s, hy - y * s] };
}

export function texturePainter(frame: TextureFrame, pal: Palette, art: ArtConfig, lod: LodConfig): Painter {
  return { view: textureView(frame), pal, art, lod: makeLod(lod) };
}
