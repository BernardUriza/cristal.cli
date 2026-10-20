import { readJson, writeJson } from "../../shared/storage";
import { CELL, WALL_THICK, cellCenter, type Maze } from "../maze";
import { connectedNeighbors, type CellCoord } from "../mazeGraph";
import { cellKey } from "../MazeRouteAdvisor";
import { fnv1a, mulberry32 } from "../../shared/rng";
import type { Stance } from "../../terminal/psych/StanceClassifier";

export type WallSide = "n" | "s" | "e" | "w";
export type InscriptionSource = "console" | "starvation" | "echo";

export interface WorldInscription {
  id: string;
  text: string;
  cell: CellCoord;
  side: WallSide;
  stance: Stance | null;
  source: InscriptionSource;
  accent: string;
  at: number;
}

export interface WallSlot {
  cell: CellCoord;
  side: WallSide;
}

export const INSCRIPTION_LIMIT = 24;
export const INSCRIPTION_MAX_CHARS = 28;
export const INSCRIPTION_HEIGHT = 1.7;
const STORAGE_KEY = "cristal.inscriptions.v1";
const SIDES: WallSide[] = ["n", "e", "s", "w"];
const STOP = new Set(["me", "mi", "mis", "el", "la", "los", "las", "un", "una", "de", "del", "que", "y", "o", "en", "es", "al", "se", "lo", "por", "con", "no", "ya", "su", "sus", "tu", "tus", "a"]);

export function slotKey(slot: WallSlot): string {
  return `${cellKey(slot.cell)}:${slot.side}`;
}

export function wallSlots(maze: Maze, cell: CellCoord): WallSlot[] {
  const data = maze.cells[cell.y]?.[cell.x];
  if (!data) return [];
  return SIDES.filter((side) => data[side]).map((side) => ({ cell, side }));
}

function ring(maze: Maze, origin: CellCoord, depth: number): CellCoord[][] {
  const rings: CellCoord[][] = [[origin]];
  const seen = new Set([cellKey(origin)]);
  for (let r = 1; r <= depth; r++) {
    const next: CellCoord[] = [];
    for (const cell of rings[r - 1]) {
      for (const neighbor of connectedNeighbors(maze, cell.x, cell.y)) {
        const key = cellKey(neighbor);
        if (seen.has(key)) continue;
        seen.add(key);
        next.push(neighbor);
      }
    }
    rings.push(next);
  }
  return rings;
}

export function placeInscription(
  maze: Maze,
  origin: CellCoord,
  existing: readonly WorldInscription[],
  seed: number,
  options: { minRing?: number; maxRing?: number } = {}
): WallSlot | null {
  const minRing = options.minRing ?? 0;
  const maxRing = options.maxRing ?? 3;
  const taken = new Set(existing.map((item) => slotKey({ cell: item.cell, side: item.side })));
  const rings = ring(maze, origin, maxRing);
  const rng = mulberry32(seed);
  for (let r = minRing; r <= maxRing; r++) {
    const free = (rings[r] ?? []).flatMap((cell) => wallSlots(maze, cell)).filter((slot) => !taken.has(slotKey(slot)));
    if (free.length > 0) return free[Math.floor(rng() * free.length)];
  }
  return null;
}

export function inscriptionPose(maze: Maze, slot: WallSlot): { position: [number, number, number]; rotationY: number } {
  const [cx, cz] = cellCenter(maze, slot.cell.x, slot.cell.y);
  const inset = CELL / 2 - WALL_THICK / 2 - 0.03;
  switch (slot.side) {
    case "n":
      return { position: [cx, INSCRIPTION_HEIGHT, cz - inset], rotationY: 0 };
    case "s":
      return { position: [cx, INSCRIPTION_HEIGHT, cz + inset], rotationY: Math.PI };
    case "e":
      return { position: [cx + inset, INSCRIPTION_HEIGHT, cz], rotationY: -Math.PI / 2 };
    case "w":
      return { position: [cx - inset, INSCRIPTION_HEIGHT, cz], rotationY: Math.PI / 2 };
  }
}

export function compactInscription(text: string, max = INSCRIPTION_MAX_CHARS): string {
  const clean = text.trim().replace(/\s+/g, " ");
  return clean.length > max ? `${clean.slice(0, max - 1)}…` : clean;
}

export function deformPhrase(phrase: string, seed: number): string {
  const words = phrase.trim().split(/\s+/).filter(Boolean);
  if (words.length <= 1) return words[0] ? `… ${words[0]} …` : "…";
  const rng = mulberry32(seed);
  const content = words.map((word, index) => ({ word, index })).filter(({ word }) => !STOP.has(word.toLowerCase()));
  const pool = content.length > 0 ? content : words.map((word, index) => ({ word, index }));
  const keep = new Set<number>();
  const keepCount = Math.min(pool.length, pool.length >= 3 ? 2 : 1);
  while (keep.size < keepCount) keep.add(pool[Math.floor(rng() * pool.length)].index);
  const out: string[] = [];
  words.forEach((word, index) => {
    if (keep.has(index)) out.push(word);
    else if (out[out.length - 1] !== "…") out.push("…");
  });
  return out.join(" ");
}

export function inscriptionId(text: string, at: number): string {
  return `ins_${(fnv1a(text) ^ (at >>> 0)).toString(16)}`;
}

export function loadInscriptions(): WorldInscription[] {
  const parsed = readJson(STORAGE_KEY);
  if (!Array.isArray(parsed)) return [];
  return parsed
    .filter((item): item is WorldInscription =>
      typeof item === "object" && item !== null && typeof (item as WorldInscription).text === "string" && typeof (item as WorldInscription).id === "string"
    )
    .slice(-INSCRIPTION_LIMIT);
}

export function saveInscriptions(inscriptions: readonly WorldInscription[]): void {
  writeJson(STORAGE_KEY, inscriptions.slice(-INSCRIPTION_LIMIT));
}
