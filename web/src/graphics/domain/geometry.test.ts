import { describe, expect, it } from "vitest";
import { arcSegments, logSpiral, midpoint, polar, regularPolygon, star, wedge } from "./geometry";
import { pathData } from "../renderers/pathData";

const dist = (a: readonly number[], b: readonly number[]) => Math.hypot(a[0] - b[0], a[1] - b[1]);

describe("geometry", () => {
  it("regular polygons keep every vertex on the circle, first vertex at the top", () => {
    const pts = regularPolygon(10, 20, 5, 6);
    expect(pts.length).toBe(6);
    for (const p of pts) expect(dist(p, [10, 20])).toBeCloseTo(5, 9);
    expect(pts[0][0]).toBeCloseTo(10, 9);
    expect(pts[0][1]).toBeCloseTo(15, 9);
  });

  it("stars alternate outer and inner radius", () => {
    const pts = star(0, 0, 10, 4, 5);
    expect(pts.length).toBe(10);
    pts.forEach((p, i) => expect(dist(p, [0, 0])).toBeCloseTo(i % 2 === 0 ? 10 : 4, 9));
  });

  it("log spirals grow monotonically and mirror cleanly", () => {
    const a = logSpiral(0, 0, 1, 0.3, 1, 20);
    const b = logSpiral(0, 0, 1, 0.3, 1, 20, true);
    for (let i = 1; i < a.length; i++) expect(dist(a[i], [0, 0])).toBeGreaterThan(dist(a[i - 1], [0, 0]));
    a.forEach((p, i) => {
      expect(p[0]).toBeCloseTo(b[i][0], 9);
      expect(p[1]).toBeCloseTo(-b[i][1], 9);
    });
  });

  it("wedges and midpoints are exact", () => {
    const w = wedge(0, 0, 1, 2, Math.PI, Math.PI * 1.5);
    expect(w[0][0]).toBeCloseTo(-1, 9);
    expect(w[1][0]).toBeCloseTo(-2, 9);
    expect(w[2][1]).toBeCloseTo(-2, 9);
    expect(midpoint([0, 0], [4, 2])).toEqual([2, 1]);
    expect(polar(1, 1, 2, 0)).toEqual([3, 1]);
  });

  it("serialises arcs to SVG path data shared by every 2D backend", () => {
    expect(pathData(arcSegments(50, 50, 10))).toBe("M 40.0,50.0 A 10.0 10.0 0 0 1 60.0,50.0");
    expect(pathData(arcSegments(50, 50, 10, true))).toBe("M 40.0,50.0 A 13.0 13.0 0 0 1 50.0,37.5 A 13.0 13.0 0 0 1 60.0,50.0");
  });
});
