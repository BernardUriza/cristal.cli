import { describe, expect, it } from "vitest";
import { mulberry32 } from "../../../../shared/rng";
import { pointInPolygon } from "../../bezier";
import type { Vec2 } from "../../shapes";
import { contourLines, hatch, phyllotaxis, scales, spots, stipple } from "./ornamentador";

const box: Vec2[] = [[0, 0], [100, 0], [100, 60], [0, 60]];
const inside = (s: { kind: string; cx?: number; cy?: number }) => s.kind === "circle" && pointInPolygon([s.cx as number, s.cy as number], box);

describe("ornamentador", () => {
  it("hatch keeps every segment inside the polygon", () => {
    const h = hatch(box, 8, 30, { stroke: "#fff", strokeWidth: 1 });
    expect(h.shapes.length).toBeGreaterThan(5);
    for (const s of h.shapes) {
      if (s.kind !== "line") throw new Error("hatch emits lines");
      expect(pointInPolygon([(s.a[0] + s.b[0]) / 2, (s.a[1] + s.b[1]) / 2], box)).toBe(true);
    }
    expect(h.params).toEqual({ hatchSpacing: 8, hatchAngle: 30, hatchLines: h.shapes.length });
  });

  it("phyllotaxis and stipple stay inside and are deterministic", () => {
    for (const p of phyllotaxis(box, 50, 6)) expect(pointInPolygon(p, box)).toBe(true);
    const a = stipple(box, mulberry32(3), 40, 1.5, "#fff");
    const b = stipple(box, mulberry32(3), 40, 1.5, "#fff");
    expect(a).toEqual(b);
    expect(a.shapes.length).toBeGreaterThanOrEqual(34);
    expect(a.shapes.length).toBeLessThanOrEqual(40);
    expect(a.shapes.every(inside)).toBe(true);
  });

  it("spots land inside the polygon with radii in range", () => {
    const sp = spots(box, mulberry32(9), 12, 2, 5, { fill: "#000" });
    expect(sp.shapes.length).toBe(12);
    for (const s of sp.shapes) {
      if (s.kind !== "group" || s.children[0].kind !== "ellipse") throw new Error("spots emit rotated ellipse groups");
      const t = s.transform[0];
      expect("translate" in t && pointInPolygon(t.translate, box)).toBe(true);
      expect(s.children[0].rx).toBeGreaterThanOrEqual(2);
      expect(s.children[0].rx).toBeLessThanOrEqual(5);
    }
  });

  it("scales and contour lines report their counts", () => {
    const sc = scales(box, 10, { stroke: "#fff", strokeWidth: 1 });
    expect(sc.shapes.length).toBeGreaterThan(10);
    expect(sc.params.scaleCount).toBe(sc.shapes.length);
    const cl = contourLines(box, 3, { stroke: "#fff", strokeWidth: 1 }, 0.1);
    expect(cl.shapes.length).toBe(3);
    expect(cl.params).toEqual({ contourCount: 3, contourInset: 0.1 });
  });
});
