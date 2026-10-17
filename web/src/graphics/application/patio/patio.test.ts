import { describe, expect, it } from "vitest";
import { PATIO_ANOMALIES, PatioConfigError, resolvePatio, type PatioAnomaly } from "../../config/patio";
import { dot } from "../../domain/math/vec3";
import type { Shape, Vec2 } from "../../domain/shapes";
import { mulberry32 } from "../../../shared/rng";
import { mapShapes } from "./frame";
import { composePatio, patioContext } from "./index";
import { ornamentFor } from "./ornamento";
import { surfacesOf, visibleFaces } from "./surfaces";

function pointsOf(shape: Shape): Vec2[] {
  switch (shape.kind) {
    case "polygon":
    case "polyline": return shape.points;
    case "line": return [shape.a, shape.b];
    case "rect": return [[shape.x, shape.y], [shape.x + shape.w, shape.y + shape.h]];
    case "circle": return [[shape.cx, shape.cy]];
    case "ellipse": return [[shape.cx, shape.cy]];
    case "path": return shape.segments.flatMap((s) => ("p" in s ? [s.p] : []));
    case "group": return shape.children.flatMap(pointsOf);
  }
}

function bbox(pts: readonly Vec2[]): { x0: number; y0: number; x1: number; y1: number } {
  const xs = pts.map((p) => p[0]);
  const ys = pts.map((p) => p[1]);
  return { x0: Math.min(...xs), y0: Math.min(...ys), x1: Math.max(...xs), y1: Math.max(...ys) };
}

const stageOf = (anomaly: PatioAnomaly, name: string) => composePatio({ seed: 7, anomaly }).stages.find((s) => s.name === name)!;

describe("composePatio", () => {
  it("is deterministic per seed and sensitive to it", () => {
    const a = JSON.stringify(composePatio({ seed: 11, anomaly: "escalera-imposible" }, mulberry32(11)));
    const b = JSON.stringify(composePatio({ seed: 11, anomaly: "escalera-imposible" }, mulberry32(11)));
    const c = JSON.stringify(composePatio({ seed: 12, anomaly: "escalera-imposible" }, mulberry32(12)));
    expect(a).toBe(b);
    expect(a).not.toBe(c);
  });

  it("paints only faces that look at the camera", () => {
    const ctx = patioContext({ seed: 7 });
    const faces = visibleFaces(ctx);
    expect(faces.length).toBeGreaterThan(100);
    for (const f of faces) expect(dot(f.normal, ctx.projector.forward)).toBeLessThan(0);
  });

  it("keeps every anchor inside the viewport, for every anomaly", () => {
    for (const anomaly of PATIO_ANOMALIES) {
      const out = composePatio({ seed: 7, anomaly });
      expect(out.anchors.length).toBeGreaterThan(10);
      for (const a of out.anchors) {
        expect(a.screen[0]).toBeGreaterThanOrEqual(0);
        expect(a.screen[0]).toBeLessThanOrEqual(out.width);
        expect(a.screen[1]).toBeGreaterThanOrEqual(0);
        expect(a.screen[1]).toBeLessThanOrEqual(out.height);
        expect(a.sizePx).toBeGreaterThan(0);
      }
      const kinds = new Set(out.anchors.map((a) => a.kind));
      expect(kinds.has("patio-centro") && kinds.has("torre-cima") && kinds.has("ventana")).toBe(true);
      if (anomaly === "columna-figura") expect(kinds.has("columna-figura")).toBe(true);
    }
  });

  it("adds shapes in the anomaly stage for every anomaly, and none for `none`", () => {
    expect(stageOf("none", "anomalía").shapes).toEqual([]);
    for (const anomaly of PATIO_ANOMALIES) {
      if (anomaly === "none") continue;
      const stage = stageOf(anomaly, "anomalía");
      expect(stage.shapes.length).toBeGreaterThan(0);
      expect(stage.provenance?.decision.length).toBeGreaterThan(10);
    }
    const names = composePatio({ seed: 7 }).stages.map((s) => s.name);
    expect(names).toEqual(["planta", "volúmenes", "ornamento", "símbolos", "anomalía"]);
  });

  it("projects a face's ornament inside that face's projected bounding box", () => {
    const ctx = patioContext({ seed: 7, detail: 3, density: 0.8 });
    let sampled = 0;
    for (const s of surfacesOf(ctx)) {
      const local = ornamentFor(s, ctx);
      if (local.length === 0) continue;
      const face = bbox(s.face.points.map((p) => ctx.projector.toScreen(p)));
      const pts = mapShapes(local, s.frame, ctx.projector).flatMap(pointsOf);
      for (const p of pts.filter((_, i) => i % 7 === 0).slice(0, 5)) {
        expect(p[0]).toBeGreaterThanOrEqual(face.x0 - 1.5);
        expect(p[0]).toBeLessThanOrEqual(face.x1 + 1.5);
        expect(p[1]).toBeGreaterThanOrEqual(face.y0 - 1.5);
        expect(p[1]).toBeLessThanOrEqual(face.y1 + 1.5);
        sampled++;
      }
      if (sampled >= 40) break;
    }
    expect(sampled).toBeGreaterThanOrEqual(20);
  });

  it("drops two towers to rooms with towers = 2", () => {
    const four = composePatio({ seed: 7, towers: 4 });
    const two = composePatio({ seed: 7, towers: 2 });
    expect(four.anchors.filter((a) => a.kind === "torre-cima")).toHaveLength(4);
    expect(two.anchors.filter((a) => a.kind === "torre-cima")).toHaveLength(2);
  });

  it("rejects configs out of range", () => {
    expect(() => resolvePatio({ density: 1.5 })).toThrow(PatioConfigError);
    expect(() => resolvePatio({ detail: 4 as 3 })).toThrow(PatioConfigError);
    expect(() => resolvePatio({ anomaly: "nada" as PatioAnomaly })).toThrow(PatioConfigError);
    expect(() => resolvePatio({ towers: 3 as 2 })).toThrow(PatioConfigError);
    expect(resolvePatio({}).ornament).toHaveLength(6);
  });
});
