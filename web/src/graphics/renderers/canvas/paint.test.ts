import { describe, expect, it } from "vitest";
import { arcFromEndpoints, arcSegments, pointedRingSegments } from "../../domain/geometry";
import { circle, group, path, polygon, rect, stroked } from "../../domain/shapes";
import { paintDisplayList, type Canvas2D } from "./paint";

function recorder(): { ctx: Canvas2D; calls: string[] } {
  const calls: string[] = [];
  const num = (v: unknown) => (typeof v === "number" ? Number(v.toFixed(2)) : v);
  const ctx = new Proxy({ fillStyle: "", strokeStyle: "", lineWidth: 1, lineJoin: "miter", globalAlpha: 1, shadowBlur: 0, shadowColor: "" } as Record<string, unknown>, {
    get: (target, prop: string) => (prop in target ? target[prop] : (...args: unknown[]) => calls.push(`${prop}(${args.map(num).join(",")})`)),
    set: (target, prop: string, value) => {
      target[prop] = value;
      calls.push(`${prop}=${String(value)}`);
      return true;
    },
  });
  return { ctx: ctx as unknown as Canvas2D, calls };
}

describe("canvas painter", () => {
  it("traces polygons closed, strokes after fill, and resets alpha per shape", () => {
    const { ctx, calls } = recorder();
    paintDisplayList(ctx, [polygon([[0, 0], [10, 0], [10, 10]], { fill: "#f00", stroke: "#000", strokeWidth: 2, opacity: 0.5 })]);
    expect(calls).toEqual(["save()", "beginPath()", "moveTo(0,0)", "lineTo(10,0)", "lineTo(10,10)", "closePath()", "globalAlpha=0.5", "lineJoin=miter", "shadowBlur=0", "fillStyle=#f00", "fill()", "strokeStyle=#000", "lineWidth=2", "stroke()", "restore()"]);
  });

  it("converts endpoint arcs into centre arcs that pass through both endpoints", () => {
    const seg = pointedRingSegments(100, 100, 40, 30);
    const first = seg[1];
    if (first.op !== "A") throw new Error("expected arc");
    const a = arcFromEndpoints([60, 100], first.p, first.r, first.large, first.sweep);
    expect(Math.hypot(60 - a.cx, 100 - a.cy)).toBeCloseTo(a.r, 6);
    expect(Math.hypot(first.p[0] - a.cx, first.p[1] - a.cy)).toBeCloseTo(a.r, 6);
    expect(a.anticlockwise).toBe(false);
    const mid = arcFromEndpoints([40, 50], [60, 50], 10, 0, 1);
    expect(mid.cx).toBeCloseTo(50, 9);
    expect(mid.cy).toBeCloseTo(50, 9);
    const { ctx, calls } = recorder();
    paintDisplayList(ctx, [path(arcSegments(50, 50, 10), stroked("#000", 1))]);
    expect(calls).toContain("arc(50,50,10,3.14,0,false)");
  });

  it("applies group transforms in order inside save/restore and glows with shadow", () => {
    const { ctx, calls } = recorder();
    paintDisplayList(ctx, [group([{ rotate: 90 }, { translate: [0, -22] }], [rect(0, 0, 5, 5, { fill: "#0f0" })]), circle(1, 1, 1, stroked("#39ff14", 2, { glow: true }))]);
    const i = calls.indexOf("rotate(1.57)");
    expect(calls[i - 1]).toBe("save()");
    expect(calls[i + 1]).toBe("translate(0,-22)");
    expect(calls.slice(i).indexOf("restore()")).toBeGreaterThan(0);
    expect(calls).toContain("shadowBlur=6");
    expect(calls).toContain("shadowColor=#39ff14");
  });
});
