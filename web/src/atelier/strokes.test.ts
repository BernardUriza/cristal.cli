import { describe, expect, it } from "vitest";
import { composeIllustration } from "../graphics/application/compose.ts";
import { circle, rect, solid } from "../graphics/domain/shapes.ts";
import { configFor, direct } from "./director.ts";
import { strokeAt } from "./hitTest.ts";
import { buildManifest, strokeLog } from "./manifest.ts";
import { describeShape, flattenStrokes, stageBounds } from "./strokes.ts";

const ill = composeIllustration(configFor(direct("un templo de día"), 600, 450));

describe("strokes", () => {
  it("flattens the stages in order and keeps every shape", () => {
    const strokes = flattenStrokes(ill.stages);
    expect(strokes.length).toBe(ill.layers.length);
    expect(strokes.map((s) => s.index)).toEqual(strokes.map((_, i) => i));
    const bounds = stageBounds(ill.stages);
    expect(bounds[0]).toEqual({ name: "fondo", from: 0, to: 1 });
    expect(bounds[bounds.length - 1].to).toBe(strokes.length);
  });

  it("describes a shape with its numbers", () => {
    expect(describeShape(circle(10, 20, 5, solid("#fff")))).toBe("círculo r=5 en (10, 20)");
    expect(describeShape(rect(0, 0, 3, 4, solid("#fff")))).toBe("rectángulo 3×4 en (0, 0)");
  });

  it("hit-tests the topmost small stroke under the point and skips the backdrop", () => {
    const stages = [
      { name: "fondo", shapes: [rect(0, 0, 100, 100, solid("#000"))] },
      { name: "a", shapes: [circle(50, 50, 10, solid("#f00")), circle(50, 50, 4, solid("#0f0"))] },
    ];
    const strokes = flattenStrokes(stages);
    expect(strokeAt(strokes, [50, 50], 10000)?.index).toBe(2);
    expect(strokeAt(strokes, [50, 50], 10000, 2)?.index).toBe(1);
    expect(strokeAt(strokes, [5, 5], 10000)).toBeNull();
  });

  it("the manifest counts every stroke per stage and hashes the svg deterministically", () => {
    const recipe = direct("un templo de día");
    const m = buildManifest(recipe, ill);
    expect(m.etapas.reduce((n, e) => n + e.trazos, 0)).toBe(m.trazos);
    expect(m.hashSvg).toBe(buildManifest(recipe, composeIllustration(configFor(recipe, 600, 450))).hashSvg);
    expect(m.procedencia.referenciaExterna).toBe("ninguna imagen externa");
    expect(strokeLog(ill).split("\n")).toHaveLength(m.trazos);
  });
});
