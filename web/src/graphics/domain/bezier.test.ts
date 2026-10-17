import { describe, expect, it } from "vitest";
import { catmullRomCubics, cubicPoint, flattenCubics, mirrorAnchors, pointInPolygon, polygonBounds, polygonCentroid, transformPoints, type CubicSegment } from "./bezier";

const square: CubicSegment[] = [
  [[0, 0], [0, 0], [1, 0], [1, 0]],
  [[1, 0], [1, 0], [1, 1], [1, 1]],
  [[1, 1], [1, 1], [0, 1], [0, 1]],
  [[0, 1], [0, 1], [0, 0], [0, 0]],
];

describe("bezier", () => {
  it("cubicPoint hits the endpoints and the symmetric midpoint", () => {
    expect(cubicPoint([0, 0], [1, 2], [3, 2], [4, 0], 0)).toEqual([0, 0]);
    expect(cubicPoint([0, 0], [1, 2], [3, 2], [4, 0], 1)).toEqual([4, 0]);
    const mid = cubicPoint([0, 0], [1, 2], [3, 2], [4, 0], 0.5);
    expect(mid[0]).toBeCloseTo(2, 9);
    expect(mid[1]).toBeCloseTo(1.5, 9);
  });

  it("flattenCubics returns a closed polyline with steps points per segment", () => {
    const poly = flattenCubics(square, 4);
    expect(poly.length).toBe(16);
    expect(poly[0]).toEqual([0, 0]);
    expect(poly[4]).toEqual([1, 0]);
  });

  it("pointInPolygon is even-odd", () => {
    const poly = flattenCubics(square, 2);
    expect(pointInPolygon([0.5, 0.5], poly)).toBe(true);
    expect(pointInPolygon([1.5, 0.5], poly)).toBe(false);
    const ring = [...poly, ...[[0.25, 0.25], [0.75, 0.25], [0.75, 0.75], [0.25, 0.75]] as [number, number][]];
    expect(pointInPolygon([0.5, 0.5], ring)).toBe(false);
  });

  it("bounds, centroid and transforms agree", () => {
    const poly = flattenCubics(square, 2);
    expect(polygonBounds(poly)).toEqual({ minX: 0, minY: 0, maxX: 1, maxY: 1 });
    const c = polygonCentroid(poly);
    expect(c[0]).toBeCloseTo(0.5, 9);
    expect(c[1]).toBeCloseTo(0.5, 9);
    const moved = transformPoints([[0.5, 0]], { cx: 10, cy: 20, size: 4, rotate: 90 });
    expect(moved[0][0]).toBeCloseTo(10, 9);
    expect(moved[0][1]).toBeCloseTo(22, 9);
    const mirrored = transformPoints([[0.5, 0]], { cx: 0, cy: 0, size: 2, mirror: true });
    expect(mirrored[0][0]).toBeCloseTo(-1, 9);
  });

  it("catmull-rom contours pass through every anchor and sharp anchors collapse their handles", () => {
    const segs = catmullRomCubics([{ p: [0, 0], sharp: true }, { p: [1, 0] }, { p: [1, 1] }, { p: [0, 1] }]);
    expect(segs.length).toBe(4);
    expect(segs[0][0]).toEqual([0, 0]);
    expect(segs[0][1]).toEqual([0, 0]);
    expect(segs[3][2]).toEqual([0, 0]);
    expect(segs[1][1]).not.toEqual([1, 0]);
  });

  it("mirrorAnchors reflects the right half without duplicating the axis anchors", () => {
    const full = mirrorAnchors([{ p: [0, -1] }, { p: [1, 0], sharp: true }, { p: [0, 1] }]);
    expect(full.map((a) => a.p)).toEqual([[0, -1], [1, 0], [0, 1], [-1, 0]]);
    expect(full[3].sharp).toBe(true);
  });
});
