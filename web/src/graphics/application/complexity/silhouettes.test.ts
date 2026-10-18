import { describe, expect, it } from "vitest";
import { COMPLEXITY_TUNING } from "../../config/complexity.ts";
import { tagRoot, type SemanticKind } from "../../domain/semantic.ts";
import { circle, group, polygon, rect, solid, type Shape, type Vec2 } from "../../domain/shapes.ts";
import { complexityReport, evaluate, silhouetteUnits } from "./index.ts";

const W = 1200, H = 900;
const ink = solid("#fff");
const unit = (root: string, kind: SemanticKind, shapes: Shape[]) => tagRoot(shapes, { root, kind });
const rows = (list: Shape[]) => evaluate(complexityReport({ list, width: W, height: H }));
const row = (list: Shape[], name: string) => rows(list).find((r) => r.criterio === name)!;

const uShape = (x: number, y: number, s: number, notchW: number, notchH: number): Vec2[] => {
  const n0 = x + (s - notchW) / 2, n1 = n0 + notchW;
  return [[x, y], [n0, y], [n0, y + notchH], [n1, y + notchH], [n1, y], [x + s, y], [x + s, y + s], [x, y + s]];
};

const fourForms = (): Shape[] => [
  ...unit("torre", "building", [rect(20, 100, 200, 700, ink)]),
  ...unit("salon", "building", [rect(260, 600, 560, 260, ink)]),
  ...unit("piramide", "building", [polygon([[260, 520], [740, 520], [500, 40]], ink)]),
  ...unit("claustro", "building", [polygon(uShape(760, 80, 420, 180, 260), ink)]),
];

describe("visible semantic silhouettes", () => {
  it("twenty identical towers are one cluster, not twenty", () => {
    const towers = Array.from({ length: 20 }, (_, i) => unit(`torre-${i}`, "building", [rect(20 + (i % 10) * 115, i < 10 ? 100 : 500, 40, 160, ink)])).flat();
    const s = complexityReport({ list: towers, width: W, height: H }).silhouettes.buildings;
    expect(s.eligibleUnits).toBe(20);
    expect(s.distinctClusters).toBe(1);
    expect(s.effectiveDiversity).toBeCloseTo(1, 6);
    expect(row(towers, "edificios: clústeres de siluetas visibles").pasa).toBe(false);
  });

  it("five different figurines in a corner report a small canvasFill with no pass or fail", () => {
    const corner = [
      ...unit("a", "creature", [circle(40, 40, 30, ink)]),
      ...unit("b", "creature", [rect(90, 10, 24, 100, ink)]),
      ...unit("c", "creature", [rect(130, 40, 100, 26, ink)]),
      ...unit("d", "creature", [polygon([[240, 110], [320, 110], [280, 10]], ink)]),
      ...unit("e", "creature", [polygon(uShape(330, 10, 90, 40, 60), ink)]),
    ];
    const s = complexityReport({ list: corner, width: W, height: H }).silhouettes.creatures;
    expect(s.eligibleUnits).toBe(5);
    expect(s.distinctClusters).toBeGreaterThanOrEqual(4);
    const fill = row(corner, "criaturas: canvasFill (visible / lienzo)");
    expect(fill.pasa).toBeNull();
    expect(fill.valor).toBeLessThan(0.05);
  });

  it("four really different forms pass both silhouette criteria; coverage is measured, never judged", () => {
    const s = complexityReport({ list: fourForms(), width: W, height: H }).silhouettes.buildings;
    expect(s.distinctClusters).toBe(4);
    expect(s.effectiveDiversity).toBeCloseTo(4, 6);
    expect(complexityReport({ list: fourForms(), width: W, height: H }).coverage.buildings.canvasFill).toBeGreaterThanOrEqual(0.4);
    expect(rows(fourForms()).filter((r) => r.criterio.startsWith("edificios")).map((r) => r.pasa)).toEqual([true, true, null, null, null]);
  });

  it("measures after occlusion: a tower mostly hidden by a later wall is not eligible", () => {
    const list = [...unit("torre", "building", [rect(100, 100, 100, 400, ink)]), ...unit("muro", "building", [rect(60, 160, 400, 400, ink)])];
    const [tower, wall] = silhouetteUnits(list, W, H, COMPLEXITY_TUNING);
    expect(tower.visibleRatio).toBeCloseTo(0.15, 2);
    expect(wall.visibleRatio).toBe(1);
    expect(complexityReport({ list, width: W, height: H }).silhouettes.buildings.eligibleUnits).toBe(1);
  });

  it("a root tagged on a group reaches its children; untagged shapes neither count nor hide", () => {
    const list = [...unit("criatura", "creature", [group([{ translate: [300, 300] }], [circle(0, 0, 50, ink), rect(-20, 40, 40, 80, ink)])]), rect(0, 0, W, H, solid("#000", { opacity: 0.5 }))];
    const units = silhouetteUnits(list, W, H, COMPLEXITY_TUNING);
    expect(units.map((u) => [u.id, u.visibleRatio])).toEqual([["creature:criatura", 1]]);
    expect(units[0].areaPx).toBeGreaterThan(Math.PI * 50 * 50);
  });

  it("a deliberately monolithic work is recorded as one architectural unit, not forced", () => {
    const list = unit("templo", "building", [rect(100, 100, 900, 600, ink), rect(300, 50, 200, 100, ink)]);
    const report = complexityReport({ list, width: W, height: H });
    expect(report.silhouettes.buildings).toMatchObject({ units: 1, monolithic: true });
    const building = evaluate(report).filter((r) => r.criterio.startsWith("edificios") && !r.umbral.startsWith("sin umbral"));
    expect(building.every((r) => r.pasa === null && r.nota?.includes("monolítica"))).toBe(true);
  });

  it("normalises scale and position but keeps proportions", () => {
    const list = [
      ...unit("torre", "building", [rect(40, 40, 60, 240, ink)]),
      ...unit("torre-grande", "building", [rect(400, 100, 150, 600, ink)]),
      ...unit("torre-ancha", "building", [rect(700, 300, 240, 240, ink)]),
    ];
    const s = complexityReport({ list, width: W, height: H }).silhouettes.buildings;
    expect(s.eligibleUnits).toBe(3);
    expect(s.distinctClusters).toBe(2);
  });

  it("is deterministic", () => {
    expect(complexityReport({ list: fourForms(), width: W, height: H }).silhouettes).toEqual(complexityReport({ list: fourForms(), width: W, height: H }).silhouettes);
  });
});
