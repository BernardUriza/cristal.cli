import { describe, expect, it } from "vitest";
import { line, rect, solid, stroked, type DisplayList } from "../../domain/shapes.ts";
import { CLOISTER_LAYOUT, CLOISTER_PROGRAM } from "../../config/programs.ts";
import { buildPlan } from "../../domain/architecture/plan.ts";
import { COMPLEXITY_TUNING } from "../../config/complexity.ts";
import { detailBand, multiscaleCoverage } from "./bands.ts";
import { complexityReport, evaluate, graphFromPlan, topologicalDiversity, type SpaceGraph } from "./index.ts";
import { graphSignature } from "./topology.ts";

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

describe("evaluate", () => {
  it("reports every criterion against its threshold without summing", () => {
    const report = complexityReport({ list: [rect(0, 0, 50, 50, ink)], width: 200, height: 200 });
    const rows = evaluate(report, { topologies: 1 });
    expect(rows.map((r) => r.pasa)).toEqual([false, null, null, false, null, null, null, null, null, null, null, null, null, null, null, null]);
    expect(rows[rows.length - 1].valor).toBeNull();
    const withBattery = evaluate(report, { topologies: 1, occlusionViolations: 0 });
    expect(withBattery[withBattery.length - 1].pasa).toBe(true);
  });
});

describe("coverage of outlines", () => {
  it("an outlined closed shape covers its interior, not its bounding box", async () => {
    const { multiscaleCoverage } = await import("./bands.ts");
    const { COMPLEXITY_TUNING } = await import("../../config/complexity.ts");
    const { polygon, stroked } = await import("../../domain/shapes.ts");
    const triangle = polygon([[0, 0], [400, 0], [0, 400]], stroked("#000", 1));
    const band3 = multiscaleCoverage([triangle], 1000, 1000, COMPLEXITY_TUNING)[3].areaPct;
    expect(band3).toBeGreaterThan(7);
    expect(band3).toBeLessThan(9);
  });
});
