import { describe, expect, it } from "vitest";
import { DOOR_H } from "./config";
import { buildDoors, deadCorridorCount, dimsForShape, doorSlots, driftDims, nearestDoorIndex, surfaceForShape } from "./geometry";
import type { SafeExit } from "../SafeExitResolver";
import type { MicroMirrors } from "../MicroMirrorGenerator";

const safeExit = (index: number): SafeExit => ({ index, label: "x", seed: 1, warmth: 0.5, pulseScale: 1, portalStability: 1 });
const mirrors = (doorLabelMode: MicroMirrors["doorLabelMode"], deadCorridors = 0): MicroMirrors => ({
  doorLabelMode,
  softenedRoomName: null,
  deadCorridors,
  note: null,
});

describe("dimsForShape", () => {
  it("gives each shape its own proportions and defaults to chamber", () => {
    expect(dimsForShape("corridor")).toEqual({ w: 6, d: 20, h: 4 });
    expect(dimsForShape("shaft")).toEqual({ w: 8, d: 8, h: 13 });
    expect(dimsForShape("void")).toEqual({ w: 24, d: 24, h: 9 });
    expect(dimsForShape("chamber")).toEqual({ w: 12, d: 12, h: 5 });
    expect(dimsForShape("corridor").d).toBeGreaterThan(dimsForShape("corridor").w);
    expect(dimsForShape("shaft").h).toBeGreaterThan(dimsForShape("shaft").w);
  });

  it("drift widens the room proportionally", () => {
    const base = dimsForShape("chamber");
    expect(driftDims(base, 0)).toEqual(base);
    const drifted = driftDims(base, 1);
    expect(drifted.w).toBeGreaterThan(base.w);
    expect(drifted.d).toBeGreaterThan(base.d);
    expect(drifted.h).toBeGreaterThan(base.h);
  });

  it("surface differs per shape", () => {
    expect(surfaceForShape("corridor").metalness).toBeGreaterThan(surfaceForShape("chamber").metalness);
    expect(surfaceForShape("void").roughness).toBeGreaterThan(0.9);
  });
});

describe("doorSlots", () => {
  it("places four slots on the four walls, inside the dims, at door mid-height", () => {
    for (const shape of ["chamber", "corridor", "shaft", "void"] as const) {
      const dims = dimsForShape(shape);
      const slots = doorSlots(dims);
      expect(slots).toHaveLength(4);
      for (const s of slots) {
        expect(Math.abs(s.position[0])).toBeLessThanOrEqual(dims.w / 2);
        expect(Math.abs(s.position[2])).toBeLessThanOrEqual(dims.d / 2);
        expect(s.position[1]).toBe(DOOR_H / 2);
      }
      const onWall = slots.filter((s) => Math.abs(s.position[0]) > dims.w / 2 - 0.1 || Math.abs(s.position[2]) > dims.d / 2 - 0.1);
      expect(onWall).toHaveLength(4);
    }
  });
});

describe("buildDoors", () => {
  const dims = dimsForShape("chamber");

  it("assigns sequential indices, one door per exit", () => {
    const doors = buildDoors({ exits: ["a", "b", "c"] }, dims);
    expect(doors.map((d) => d.index)).toEqual([0, 1, 2]);
    expect(doors.map((d) => d.label)).toEqual(["1", "2", "3"]);
    expect(doors.every((d) => !d.safe)).toBe(true);
  });

  it("adds the safe exit as an extra door and marks it", () => {
    const doors = buildDoors({ exits: ["a", "b"] }, dims, safeExit(2));
    expect(doors).toHaveLength(3);
    expect(doors.filter((d) => d.safe).map((d) => d.index)).toEqual([2]);
  });

  it("never exceeds the four wall slots", () => {
    expect(buildDoors({ exits: ["a", "b", "c", "d", "e"] }, dims, safeExit(4))).toHaveLength(4);
  });

  it("clinical mirrors relabel doors", () => {
    const doors = buildDoors({ exits: ["a", "b"] }, dims, null, mirrors("clinical"));
    expect(doors.map((d) => d.label)).toEqual(["D-01", "D-02"]);
  });
});

describe("deadCorridorCount", () => {
  it("fills only the unused wall slots", () => {
    expect(deadCorridorCount(null, 2, 1)).toBe(0);
    expect(deadCorridorCount(mirrors("plain", 3), 2, 0)).toBe(2);
    expect(deadCorridorCount(mirrors("plain", 1), 1, 1)).toBe(2);
  });
});

describe("nearestDoorIndex", () => {
  it("returns the closest door within range, else null", () => {
    const dims = dimsForShape("chamber");
    const doors = buildDoors({ exits: ["a", "b", "c", "d"] }, dims);
    expect(nearestDoorIndex(doors, 0, -dims.d / 2 + 1, 2.4)).toBe(0);
    expect(nearestDoorIndex(doors, dims.w / 2 - 1, 0, 2.4)).toBe(3);
    expect(nearestDoorIndex(doors, 0, 0, 2.4)).toBeNull();
  });
});
