import { describe, expect, it } from "vitest";
import { mulberry32 } from "../../../../shared/rng";
import { pointInPolygon } from "../../bezier";
import type { Vec2 } from "../../shapes";
import { flowField, valueNoise, type FlowPolicy } from "./flowField";
import { MOTIFS } from "./index";
import { scales } from "./ornamentador";
import { CHARACTER } from "./character";

const policy: FlowPolicy = { noiseCells: 4, turns: 0.4, baseAngle: 60, steps: 8, jitter: 0.9 };
const star: Vec2[] = Array.from({ length: 10 }, (_, i) => {
  const r = i % 2 ? 40 : 100, t = (i / 10) * 2 * Math.PI;
  return [r * Math.cos(t), r * Math.sin(t)];
});
const fill = { spacing: 8, stepLen: 3, style: { stroke: "#fff", strokeWidth: 1 } };

describe("flow field fill (Hobbs)", () => {
  it("value noise is smooth, bounded and seeded", () => {
    const n = valueNoise(mulberry32(3), 4);
    const m = valueNoise(mulberry32(3), 4);
    for (let k = 0; k <= 20; k++) {
      const v = n(k / 20, 0.37);
      expect(v).toBeGreaterThanOrEqual(0);
      expect(v).toBeLessThanOrEqual(1);
      expect(m(k / 20, 0.37)).toBe(v);
      expect(Math.abs(n((k + 0.01) / 20, 0.37) - v)).toBeLessThan(0.02);
    }
  });

  it("is deterministic per seed and every traced point stays inside the contour", () => {
    const a = flowField(star, mulberry32(8), fill, policy);
    expect(flowField(star, mulberry32(8), fill, policy)).toEqual(a);
    expect(flowField(star, mulberry32(9), fill, policy)).not.toEqual(a);
    expect(a.shapes.length).toBeGreaterThan(40);
    expect(a.params.flowLines).toBe(a.shapes.length);
    for (const s of a.shapes) {
      if (s.kind !== "polyline") throw new Error("flow emits polylines");
      expect(s.points.length).toBeGreaterThanOrEqual(3);
      for (const p of s.points) expect(pointInPolygon(p, star)).toBe(true);
    }
  });

  it("perro detail 3 grows fur from the flow field and sirena scales carry their interruptions", () => {
    const params = { size: 300, detail: 3 as const, fill: "#000", ink: "#fff", accent: "#f0f" };
    const dog = MOTIFS.perro.draw(0, 0, params, mulberry32(5));
    expect(Number(dog.provenance.params.flowLines)).toBeGreaterThan(30);
    const mermaid = MOTIFS.sirena.draw(0, 0, params, mulberry32(5));
    const count = Number(mermaid.provenance.params.scaleCount);
    expect(mermaid.provenance.params.scaleInterrupted).toBe(Math.round(count * CHARACTER.disorder.fraction));
  });

  it("jaguar fur grows between the rosettes, never over them, and leaves detail 2 untouched", () => {
    const params = { size: 300, detail: 3 as const, fill: "#000", ink: "#fff", accent: "#f0f" };
    const d3 = MOTIFS.jaguar.draw(0, 0, params, mulberry32(5));
    const rings = d3.shapes.filter((s) => s.kind === "circle" && s.style.fill === "none");
    const r = Number(d3.provenance.params.rosetteRadius);
    expect(rings.length).toBe(d3.provenance.params.rosettes);
    const fur = d3.shapes.filter((s) => s.kind === "polyline" && s.style.opacity === CHARACTER.pelt.opacity);
    expect(fur.length).toBeGreaterThan(30);
    for (const f of fur) if (f.kind === "polyline") for (const p of f.points) for (const c of rings) if (c.kind === "circle") expect(Math.hypot(p[0] - c.cx, p[1] - c.cy)).toBeGreaterThanOrEqual(r * CHARACTER.pelt.clearance - 0.5);
    const d2 = MOTIFS.jaguar.draw(0, 0, { ...params, detail: 2 }, mulberry32(5));
    expect(d2.provenance.params.flowLines).toBeUndefined();
  });

  it("the avoid predicate keeps every stroke out of the hole", () => {
    const hole = (p: Vec2) => Math.hypot(p[0], p[1]) < 30;
    const a = flowField(star, mulberry32(8), { ...fill, avoid: hole }, policy);
    expect(a.shapes.length).toBeGreaterThan(10);
    for (const s of a.shapes) if (s.kind === "polyline") for (const p of s.points) expect(hole(p)).toBe(false);
  });

  it("scales without disorder keep their previous params", () => {
    const box: Vec2[] = [[0, 0], [100, 0], [100, 60], [0, 60]];
    const plain = scales(box, 10, { stroke: "#fff", strokeWidth: 1 });
    expect(Object.keys(plain.params)).toEqual(["scaleRowHeight", "scaleRows", "scaleCount"]);
  });
});
