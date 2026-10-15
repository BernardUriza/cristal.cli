import { describe, expect, it } from "vitest";
import { clipPolygon, planeY, planeZ, polygonNormal, sectionOfConvex } from "./clip";
import type { Vec3 } from "./vec3";

const square: Vec3[] = [[0, 0, 0], [2, 0, 0], [2, 2, 0], [0, 2, 0]];

describe("clip", () => {
  it("keeps the half of a square below a horizontal plane", () => {
    const below = clipPolygon(square, planeY(1), "negative");
    expect(below).toHaveLength(4);
    expect(Math.max(...below.map((p) => p[1]))).toBeCloseTo(1, 12);
    expect(Math.min(...below.map((p) => p[1]))).toBe(0);
  });

  it("returns the whole polygon when it is entirely on the kept side and nothing when it is not", () => {
    expect(clipPolygon(square, planeY(5), "negative")).toEqual(square);
    expect(clipPolygon(square, planeY(-5), "negative")).toEqual([]);
  });

  it("computes outward normals from winding", () => {
    expect(polygonNormal(square)).toEqual([0, 0, 1]);
    expect(polygonNormal([...square].reverse())).toEqual([0, 0, -1]);
  });

  it("sections a box by a plane into its rectangular cut", () => {
    const b = (x: number, y: number, z: number): Vec3 => [x, y, z];
    const faces: Vec3[][] = [
      [b(0, 0, 0), b(1, 0, 0), b(1, 0, 3), b(0, 0, 3)],
      [b(0, 2, 0), b(0, 2, 3), b(1, 2, 3), b(1, 2, 0)],
      [b(0, 0, 0), b(0, 2, 0), b(1, 2, 0), b(1, 0, 0)],
      [b(0, 0, 3), b(1, 0, 3), b(1, 2, 3), b(0, 2, 3)],
      [b(0, 0, 0), b(0, 0, 3), b(0, 2, 3), b(0, 2, 0)],
      [b(1, 0, 0), b(1, 2, 0), b(1, 2, 3), b(1, 0, 3)],
    ];
    const cut = sectionOfConvex(faces, planeZ(1.5));
    expect(cut).toHaveLength(4);
    for (const p of cut) expect(p[2]).toBeCloseTo(1.5, 12);
    const xs = cut.map((p) => p[0]).sort();
    const ys = cut.map((p) => p[1]).sort();
    expect(xs).toEqual([0, 0, 1, 1]);
    expect(ys).toEqual([0, 0, 2, 2]);
    expect(sectionOfConvex(faces, planeZ(9))).toEqual([]);
  });
});
