import { box, type Solid } from "../architecture/mass.ts";
import type { Rect } from "../architecture/layout.ts";
import type { PlacedSpace } from "./layout.ts";

const WALL = 0.5;
const DOOR = 1.6;

export type OpenSide = "x0" | "x1" | "z0" | "z1";

function wall(p: PlacedSpace, name: string, r: Rect, y1: number): Solid {
  return box(`${p.node.id}:${name}`, { kind: "wall", space: p.node.id }, r, p.y0, y1);
}

function sideWalls(p: PlacedSpace, side: OpenSide, y1: number, door: boolean): Solid[] {
  const r = p.rect;
  const strip: Rect =
    side === "z0" ? { ...r, z1: r.z0 + WALL } : side === "z1" ? { ...r, z0: r.z1 - WALL } : side === "x0" ? { ...r, x1: r.x0 + WALL } : { ...r, x0: r.x1 - WALL };
  if (!door) return [wall(p, `cell-${side}`, strip, y1)];
  const alongX = side === "z0" || side === "z1";
  const mid = alongX ? (r.x0 + r.x1) / 2 : (r.z0 + r.z1) / 2;
  const a: Rect = alongX ? { ...strip, x1: mid - DOOR / 2 } : { ...strip, z1: mid - DOOR / 2 };
  const b: Rect = alongX ? { ...strip, x0: mid + DOOR / 2 } : { ...strip, z0: mid + DOOR / 2 };
  return [wall(p, `cell-${side}a`, a, y1), wall(p, `cell-${side}b`, b, y1)];
}

export function openCell(p: PlacedSpace, y1: number, doors: readonly OpenSide[]): Solid[] {
  return (["z0", "x1", "z1", "x0"] as const).flatMap((side) => sideWalls(p, side, y1, doors.includes(side)));
}

export function corridor(p: PlacedSpace, y1: number): Solid[] {
  const r = p.rect;
  const alongX = r.x1 - r.x0 >= r.z1 - r.z0;
  return alongX ? [...sideWalls(p, "z0", y1, false), ...sideWalls(p, "z1", y1, true)] : [...sideWalls(p, "x0", y1, false), ...sideWalls(p, "x1", y1, true)];
}
