import type { DisplayList } from "../../domain/shapes.ts";
import { paintDisplayList } from "./paint.ts";

export function rasterize(list: DisplayList, width: number, height: number, scale = 1): HTMLCanvasElement {
  const canvas = document.createElement("canvas");
  canvas.width = Math.max(1, Math.round(width * scale));
  canvas.height = Math.max(1, Math.round(height * scale));
  const ctx = canvas.getContext("2d");
  if (!ctx) throw new Error("Canvas 2D context unavailable");
  paintDisplayList(ctx, list, scale);
  return canvas;
}
