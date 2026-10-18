import { describe, expect, it } from "vitest";
import { circle, rect, solid } from "../graphics/domain/shapes.ts";
import { direct } from "./director.ts";
import { strokeAt } from "./hitTest.ts";
import { buildManifest, strokeLog } from "./manifest.ts";
import { describeShape, flattenStrokes, stageBounds } from "./strokes.ts";
import { composeWork } from "./work.ts";

const ill = composeWork(direct("la fachada de un templo de día"), 600, 450);

describe("strokes", () => {
  it("flattens the stages in order and keeps every shape", () => {
    const strokes = flattenStrokes(ill.stages);
    expect(strokes.length).toBe(ill.stages.reduce((n, s) => n + s.shapes.length, 0));
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
    const recipe = direct("la fachada de un templo de día");
    const m = buildManifest(recipe, ill);
    expect(m.etapas.reduce((n, e) => n + e.trazos, 0)).toBe(m.trazos);
    expect(m.hashSvg).toBe(buildManifest(recipe, composeWork(recipe, 600, 450)).hashSvg);
    expect(m.procedencia.referenciaExterna).toBe("ninguna imagen externa");
    expect(strokeLog(ill).split("\n")).toHaveLength(m.trazos);
  });
});

describe("patio work", () => {
  it("Bernard's narration draws eight composite robots on a bigger, taller building", () => {
    const work = composeWork(direct("ocho robots hechos de craneos y ojos abiertos que suben escaleras infinitas simulando la IA en las manos del poder"), 600, 450);
    const figuras = work.stages[work.stages.length - 1];
    expect(figuras.provenance?.params.figuras).toBe(9);
    expect(figuras.provenance?.decision).toContain("8 robot (programa biped#");
    expect(figuras.provenance?.decision).toContain("1 mano (cuerpo=mano) en fila · patio");
    expect(figuras.provenance?.params.arquitectura).toBe("cuadrado/grande/vertiginoso");
  });

  it("draws the patio in traceable stages and places the asked figures on architectural anchors", () => {
    const recipe = direct("un claustro único de noche que se recorre con un ojo que vigila y una escalera que sube");
    const work = composeWork(recipe, 600, 450);
    expect(work.plan.composition).toBe("patio");
    expect(work.stages.map((s) => s.name)).toEqual(["planta", "volúmenes", "ornamento", "símbolos", "anomalía", "habitada"]);
    const figuras = work.stages[5];
    expect(figuras.shapes.length).toBeGreaterThan(0);
    expect(figuras.provenance?.decision).toMatch(/ojo/);
    expect(work.stages.every((s) => s.provenance)).toBe(true);
    expect(composeWork(recipe, 600, 450).stages[5].shapes.length).toBe(figuras.shapes.length);
  });
});

describe("complexity reads what the composer writes", () => {
  it("the rewrites nested in each stage's provenance count as semantic depth", async () => {
    const { workComplexity } = await import("./manifest.ts");
    const work = composeWork(direct("ocho robots hechos de craneos y ojos abiertos que suben escaleras infinitas en las manos del poder"), 1200, 900);
    const nested = work.stages.flatMap((s) => s.provenance?.rewrites ?? []);
    expect(nested.length).toBeGreaterThan(0);
    expect(workComplexity(work).semanticDepth).toBe(Math.max(...nested.map((r) => r.depth)));
  });
});
