import { describe, expect, it } from "vitest";
import { circle, group, line, polygon, rect, solid, stroked, type DisplayList, type Vec2 } from "../../domain/shapes.ts";
import { CLOISTER_LAYOUT, CLOISTER_PROGRAM } from "../../config/programs.ts";
import { buildPlan } from "../../domain/architecture/plan.ts";
import { COMPLEXITY_TUNING } from "../../config/complexity.ts";
import { complexityReport, detailBand, evaluate, graphFromPlan, graphSignature, multiscaleCoverage, semanticDepth, silhouetteDiversity, topologicalDiversity, type SpaceGraph } from "./index.ts";

const ink = solid("#fff");

describe("detailBand", () => {
  it("cuts exactly at 8, 32 and 128 px", () => {
    expect([0, 7.999, 8, 31.999, 32, 127.999, 128, 900].map(detailBand)).toEqual([0, 0, 1, 1, 2, 2, 3, 3]);
  });
});

describe("multiscale coverage", () => {
  it("measures covered area per band on a known display list", () => {
    const list: DisplayList = [rect(0, 0, 200, 200, ink), rect(0, 0, 160, 80, ink), rect(160, 160, 24, 24, ink), rect(0, 192, 4, 4, ink)];
    const bands = multiscaleCoverage(list, 200, 200, COMPLEXITY_TUNING);
    const total = 25 * 25;
    expect(bands.map((b) => b.areaPct)).toEqual([(100 * 1) / total, (100 * 9) / total, 0, (100 * 20 * 10) / total]);
  });

  it("traces strokes along cells instead of filling their bbox", () => {
    const bands = multiscaleCoverage([line([0, 0], [199, 199], stroked("#fff", 1))], 200, 200, COMPLEXITY_TUNING);
    expect(bands[3].areaPct).toBeLessThan(10);
    expect(bands[3].areaPct).toBeGreaterThan(3);
  });
});

const graph = (kinds: string[], edges: [number, number, string][], prefix: string): SpaceGraph => ({
  nodes: kinds.map((kind, i) => ({ id: `${prefix}${i}`, kind })),
  edges: edges.map(([a, b, relation]) => ({ from: `${prefix}${a}`, to: `${prefix}${b}`, relation })),
});

describe("topology", () => {
  it("gives isomorphic graphs the same signature and a different graph another", () => {
    const a = graph(["courtyard", "gallery", "gallery", "tower"], [[0, 1, "faces"], [0, 2, "faces"], [2, 3, "bridges"]], "a");
    const b = graph(["tower", "gallery", "courtyard", "gallery"], [[0, 1, "bridges"], [2, 1, "faces"], [3, 2, "faces"]], "b");
    const c = graph(["courtyard", "gallery", "gallery", "tower"], [[0, 1, "faces"], [1, 2, "faces"], [2, 3, "bridges"]], "c");
    expect(graphSignature(a)).toBe(graphSignature(b));
    expect(graphSignature(c)).not.toBe(graphSignature(a));
    expect(topologicalDiversity([a, b, c])).toBe(2);
  });

  it("derives a space graph from the cloister plan", () => {
    const g = graphFromPlan(buildPlan(CLOISTER_PROGRAM, CLOISTER_LAYOUT));
    expect(g.nodes.some((n) => n.kind === "courtyard")).toBe(true);
    expect(g.edges.some((e) => e.relation === "arch")).toBe(true);
    expect(graphSignature(g)).toBe(graphSignature({ nodes: [...g.nodes].reverse(), edges: g.edges }));
  });
});

const ngon = (n: number, r: number, cx: number, cy: number, turn: number): Vec2[] =>
  Array.from({ length: n }, (_, i) => [cx + r * Math.cos(turn + (i / n) * Math.PI * 2), cy + r * Math.sin(turn + (i / n) * Math.PI * 2)] as Vec2);

describe("silhouettes", () => {
  it("groups a circle with its scaled/rotated copy and keeps a square apart", () => {
    const list: DisplayList = [
      circle(100, 100, 40, ink),
      group([{ translate: [300, 100] }, { rotate: 33 }], [polygon(ngon(48, 90, 0, 0, 0.2), ink)]),
      rect(400, 300, 80, 80, ink),
      group([{ translate: [200, 400] }, { rotate: 45 }], [rect(-60, -60, 120, 120, ink)]),
    ];
    expect(silhouetteDiversity(list, 1000 * 1000, COMPLEXITY_TUNING)).toEqual({ candidates: 4, families: 2 });
  });
});

describe("semantic depth", () => {
  it("reads the longest rewrite chain", () => {
    const entries = [
      { operation: "rewrite", id: "r1" },
      { operation: "rewrite", id: "r2", parent: "r1" },
      { operation: "rewrite", id: "r3", parent: "r2" },
      { operation: "rewrite", id: "x", depth: 2 },
      { operation: "stamp", id: "s", depth: 9 },
    ];
    expect(semanticDepth(entries)).toBe(3);
    expect(semanticDepth([{ params: { operation: "rewrite", depth: 4 } }])).toBe(4);
    expect(semanticDepth([])).toBe(0);
  });
});

describe("evaluate", () => {
  it("reports every criterion against its threshold without summing", () => {
    const report = complexityReport({ list: [rect(0, 0, 50, 50, ink)], width: 200, height: 200 });
    const rows = evaluate(report, { topologies: 1 });
    expect(rows.map((r) => r.pasa)).toEqual([false, false, false, false, null]);
    expect(rows[4].valor).toBeNull();
  });
});

describe("masses, not faces", () => {
  it("touching pieces are one silhouette; separate masses of different shape are two families", async () => {
    const { silhouetteDiversity } = await import("./silhouettes.ts");
    const { COMPLEXITY_TUNING } = await import("../../config/complexity.ts");
    const { polygon, circle, solid } = await import("../../domain/shapes.ts");
    const face = (x: number) => polygon([[x, 100], [x + 40, 80], [x + 80, 100], [x + 40, 120]], solid("#000"));
    const oneBuilding = silhouetteDiversity([face(100), face(150), face(200)], 1000 * 1000, COMPLEXITY_TUNING);
    expect(oneBuilding).toEqual({ candidates: 1, families: 1 });
    const two = silhouetteDiversity([circle(150, 150, 60, solid("#000")), polygon([[600, 600], [800, 600], [800, 640], [600, 640]], solid("#000"))], 1000 * 1000, COMPLEXITY_TUNING);
    expect(two).toEqual({ candidates: 2, families: 2 });
  });

  it("an outlined closed shape covers its interior, not its bounding box", async () => {
    const { multiscaleCoverage } = await import("./bands.ts");
    const { COMPLEXITY_TUNING } = await import("../../config/complexity.ts");
    const { polygon, stroked } = await import("../../domain/shapes.ts");
    const triangle = polygon([[0, 0], [400, 0], [0, 400]], stroked("#000", 1));
    const band3 = multiscaleCoverage([triangle], 400, 400, COMPLEXITY_TUNING)[3].areaPct;
    expect(band3).toBeGreaterThan(45);
    expect(band3).toBeLessThan(55);
  });
});
