import { readJson, writeJson } from "../shared/storage.ts";
import type { Recipe } from "./director.ts";

export type Sketch = { id: string; title: string; seed: number; narration: string; recipe: Recipe; thumbnail: string; at: number };

const STORAGE_KEY = "cristal.atelier.wall.v1";
export const WALL_LIMIT = 24;

export function loadWall(): Sketch[] {
  const parsed = readJson(STORAGE_KEY);
  return Array.isArray(parsed) ? (parsed as Sketch[]).filter((s) => typeof s?.id === "string" && typeof s?.thumbnail === "string") : [];
}

export function saveWall(wall: Sketch[]): void {
  writeJson(STORAGE_KEY, wall.slice(-WALL_LIMIT));
}

export function pinSketch(wall: Sketch[], sketch: Sketch): Sketch[] {
  return [...wall.filter((s) => s.id !== sketch.id), sketch].slice(-WALL_LIMIT);
}

export function sketchId(recipe: Recipe): string {
  return `${recipe.seed}:${recipe.choices.map((c) => `${c.decision.field}=${String(c.decision.value)}`).join("|")}`;
}

export function thumbnailOf(canvas: HTMLCanvasElement, width = 180): string {
  const small = document.createElement("canvas");
  small.width = width;
  small.height = Math.round((width * canvas.height) / canvas.width);
  small.getContext("2d")?.drawImage(canvas, 0, 0, small.width, small.height);
  return small.toDataURL("image/jpeg", 0.7);
}
