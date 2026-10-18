import { describe, expect, it } from "vitest";
import { ARCH_REWRITE_TUNING, REWRITES } from "../../config/rewrites.ts";
import { mulberry32 } from "../../../shared/rng.ts";
import { partBounds, quad, type Part } from "../motifs/figures/parts.ts";
import type { Shape, Vec2 } from "../shapes.ts";
import { verifiedChains } from "./chains.ts";
import { facadeHost } from "./host.ts";
import { miniBuilding } from "./miniBuilding.ts";
import { miniTemple } from "./miniTemple.ts";
import { portalScene } from "./portalScene.ts";
import { applyRewrite, frameToScreen, mapPart, paintChildren, type RewriteEnv, type Rule } from "./rewrite.ts";
import { mapShapePoints } from "../mapPoints.ts";

const ink = { fill: "#fff", ink: "#000", accent: "#c00", deep: "#004", line: 1, detail: 2 as const };
const env = (clip?: Vec2[]): RewriteEnv => ({ depth: 0, seed: 3, reason: "prueba", rng: mulberry32(3), ink, clip });
const T5: Rule = { rewrite: REWRITES.T5_BUILDING_AS_ORNAMENT, produce: miniBuilding() };
const T6: Rule = { rewrite: REWRITES.T6_ARCHITECTURE_AS_ARCHITECTURE, produce: miniTemple(ARCH_REWRITE_TUNING.templeRise) };
const T7: Rule = { rewrite: REWRITES.T7_ORNAMENT_AS_SPACE, produce: portalScene() };
const ALL = [T5, T6, T7];
const minPx = (id: string) => REWRITES[id as keyof typeof REWRITES].constraints.minProjectedPx;
const box = (id: string, geometryId: string, role: Part["role"], x0: number, y0: number, x1: number, y1: number): Part => ({ id, role, geometryId, anchors: { base: [(x0 + x1) / 2, y1] }, mask: quad(x0, y0, x1, y1), frame: { o: [x0, y0], u: [x1 - x0, 0], v: [0, y1 - y0], w: (x1 - x0) / 20, h: (y1 - y0) / 20 }, children: [] });

function polygons(shapes: Shape[]): Vec2[][] {
  return shapes.flatMap((s): Vec2[][] => (s.kind === "group" ? polygons(s.children) : s.kind === "polygon" ? [s.points] : []));
}

function wall(rules: Rule[], w = 520, h = 420) {
  const host = facadeHost(w / 20, h / 20, { crown: "fronton", crownShare: ARCH_REWRITE_TUNING.frontonShare, panelAspect: 1, pick: () => true }, ink);
  const at = frameToScreen({ o: [40, 120], u: [w, 0], v: [0, h], w: w / 20, h: h / 20 });
  const part = mapPart(host.part, at, "obra.muro");
  return paintChildren(part.children, host.childShapes!.map((c) => mapShapePoints(c, at)), rules, env(quad(0, 0, 1200, 900)));
}

describe("architectural recursion without figures (T5–T7)", () => {
  it("T5 puts a building with entrance, roof and a window in the panel, inside the panel's bounds", () => {
    const out = applyRewrite(T5, box("panel", "panel", "enclosure", 0, 0, 200, 240), env(), [T5]);
    if (!("part" in out)) throw new Error(out.skipped);
    expect(out.part.children.map((c) => c.geometryId)).toEqual(["cubierta", "ventana", "ventana", "puerta"]);
    expect(out.shapes[0].kind === "group" && out.shapes[0].clip).toEqual(quad(0, 0, 200, 240));
    expect(out.records[0].evidence).toMatchObject({ ruleId: "T5_BUILDING_AS_ORNAMENT", sourceRole: "ornamento", replacementRole: "edificio", semanticChanged: true, visibleRatio: 1 });
  });

  it("T6 stands the temple on the piece's base and lets its pediment rise past the piece, changing the outline", () => {
    const roof = box("techo", "cubierta", "crown", 50, 100, 250, 140);
    const out = applyRewrite(T6, roof, env(), [T6]);
    if (!("part" in out)) throw new Error(out.skipped);
    const b = partBounds(out.part);
    expect(b.maxY).toBeCloseTo(140);
    expect(b.minY).toBeLessThan(100 - 40);
    expect(out.part.anchors.base).toEqual([150, 140]);
    expect(out.part.children.filter((c) => c.geometryId === "ventana")).toHaveLength(3);
  });

  it("T7 opens a cell into a room with two volumes, the near one drawn over the far one", () => {
    const out = applyRewrite(T7, box("celda", "celda-friso", "connector", 0, 0, 120, 150), env(), [T7]);
    if (!("part" in out)) throw new Error(out.skipped);
    expect(out.part.children.filter((c) => c.geometryId === "volumen")).toHaveLength(2);
    const [far, , near] = out.part.children;
    expect(partBounds(near).maxX).toBeGreaterThan(partBounds(far).minX);
    expect(out.records[0].evidence.replacementRole).toBe("espacio");
  });

  it("replaces instead of overlaying: a rewritten roof is no longer drawn under its temple", () => {
    const panel = box("panel", "panel", "enclosure", 0, 0, 200, 240);
    const alone = applyRewrite(T5, panel, env(), [T5]);
    const nested = applyRewrite(T5, panel, env(), [T5, T6]);
    if (!("part" in alone) || !("part" in nested)) throw new Error("skipped");
    const gable = polygons(alone.shapes).find((p) => p.length === 3)!;
    expect(gable).toBeDefined();
    expect(polygons(nested.shapes).some((p) => JSON.stringify(p) === JSON.stringify(gable))).toBe(false);
    expect(nested.records.map((r) => r.rule)).toEqual(["T5_BUILDING_AS_ORNAMENT", "T6_ARCHITECTURE_AS_ARCHITECTURE"]);
  });

  it("a wall reaches verified chains of three levels with at least two families, every level visible and over its minimum", () => {
    const { records } = wall(ALL);
    const chains = verifiedChains(records, { minVisibleRatio: 0.9, minProjectedPx: minPx });
    expect(chains.length).toBeGreaterThan(0);
    for (const c of chains) {
      expect(c.map((r) => r.depth)).toEqual([1, 2, 3]);
      expect(c.every((r) => r.evidence.semanticChanged && r.evidence.projectedAreaPx > 0)).toBe(true);
    }
    const kinds = new Set(chains.map((c) => c.map((r) => r.rule.slice(0, 2)).join("→")));
    expect(kinds.has("T5→T6→T7")).toBe(true);
    expect(kinds.has("T6→T7→T5")).toBe(true);
  });

  it("recursion stops at maxDepth and at minProjectedPx", () => {
    const { records } = wall(ALL);
    expect(Math.max(...records.map((r) => r.depth))).toBe(REWRITES.T5_BUILDING_AS_ORNAMENT.constraints.maxDepth);
    expect(records.every((r) => r.projectedPx >= minPx(r.rule))).toBe(true);
    expect(wall(ALL, 40, 30).records).toEqual([]);
  });

  it("only declared rules run: without T6 the roof stays a roof and the chains go T5→T7", () => {
    const { records } = wall([T5, T7]);
    expect(records.some((r) => r.rule === "T6_ARCHITECTURE_AS_ARCHITECTURE")).toBe(false);
    expect(records.some((r) => r.rule === "T7_ORNAMENT_AS_SPACE" && r.parent?.includes("mini-edificio"))).toBe(true);
  });
});
