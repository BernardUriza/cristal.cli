import type { RoomShape } from "../types";
import type { Room } from "../roomApi";
import type { SafeExit } from "../SafeExitResolver";
import type { MicroMirrors } from "../MicroMirrorGenerator";
import { DOOR_H } from "./config";

export interface Dims {
  w: number;
  d: number;
  h: number;
}

export interface Surface {
  roughness: number;
  metalness: number;
}

export interface DoorSlot {
  position: [number, number, number];
  rotationY: number;
}

export interface DoorSpec extends DoorSlot {
  index: number;
  safe: boolean;
  label: string;
}

const WALL_INSET = 0.05;

export function dimsForShape(shape: RoomShape): Dims {
  switch (shape) {
    case "corridor":
      return { w: 6, d: 20, h: 4 };
    case "shaft":
      return { w: 8, d: 8, h: 13 };
    case "void":
      return { w: 24, d: 24, h: 9 };
    case "chamber":
    default:
      return { w: 12, d: 12, h: 5 };
  }
}

export function driftDims(base: Dims, architectureDrift: number): Dims {
  return {
    w: base.w + architectureDrift * 2.4,
    d: base.d + architectureDrift * 3.6,
    h: base.h + architectureDrift * 1.2,
  };
}

export function surfaceForShape(shape: RoomShape): Surface {
  switch (shape) {
    case "corridor":
      return { roughness: 0.42, metalness: 0.6 };
    case "shaft":
      return { roughness: 0.55, metalness: 0.25 };
    case "void":
      return { roughness: 0.98, metalness: 0.0 };
    case "chamber":
    default:
      return { roughness: 0.9, metalness: 0.06 };
  }
}

export function doorSlots(dims: Dims): DoorSlot[] {
  const hw = dims.w / 2;
  const hd = dims.d / 2;
  const y = DOOR_H / 2;
  return [
    { position: [0, y, -hd + WALL_INSET], rotationY: 0 },
    { position: [0, y, hd - WALL_INSET], rotationY: Math.PI },
    { position: [-hw + WALL_INSET, y, 0], rotationY: Math.PI / 2 },
    { position: [hw - WALL_INSET, y, 0], rotationY: -Math.PI / 2 },
  ];
}

export function doorLabel(index: number, mirrors: MicroMirrors | null): string {
  return mirrors?.doorLabelMode === "clinical" ? `D-${String(index + 1).padStart(2, "0")}` : String(index + 1);
}

export function buildDoors(
  room: Pick<Room, "exits">,
  dims: Dims,
  safeExit: SafeExit | null = null,
  mirrors: MicroMirrors | null = null
): DoorSpec[] {
  const slots = doorSlots(dims);
  const count = Math.min(slots.length, room.exits.length + (safeExit ? 1 : 0));
  return Array.from({ length: count }, (_, i) => ({
    ...slots[i],
    index: i,
    safe: safeExit?.index === i,
    label: doorLabel(i, mirrors),
  }));
}

export function deadCorridorCount(mirrors: MicroMirrors | null, usedDoors: number, mirrorIntensity: number): number {
  if (!mirrors) return 0;
  return Math.min(4 - usedDoors, Math.round(mirrors.deadCorridors + mirrorIntensity * 1.2));
}

export function nearestDoorIndex(doors: DoorSpec[], x: number, z: number, range: number): number | null {
  let near: number | null = null;
  let best = range;
  for (const d of doors) {
    const dist = Math.hypot(d.position[0] - x, d.position[2] - z);
    if (dist < best) {
      best = dist;
      near = d.index;
    }
  }
  return near;
}
