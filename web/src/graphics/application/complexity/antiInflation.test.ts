import { describe, expect, it } from "vitest";
import { COMPLEXITY_TUNING } from "../../config/complexity.ts";
import { tagRewrite, tagRoot } from "../../domain/semantic.ts";
import { group, rect, solid, type Shape, type Vec2 } from "../../domain/shapes.ts";
import { convexHull } from "./descriptor.ts";
import { complexityReport, rewriteComplexity, SiteError, type RewriteEvidence, type RewriteRecordLike, type SiteEvidence } from "./index.ts";

const W = 600, H = 400;
const ink = solid("#fff");
const box = (x: number, y: number, s: number): Vec2[] => [[x, y], [x + s, y], [x + s, y + s], [x, y + s]];
const level = (id: string, x: number, y: number, s: number, inner: Shape[] = []): Shape => tagRewrite(group([], [rect(x, y, s, s, solid("#888")), ...inner], box(x, y, s)), id);
const rec = (rule: string, sourceNode: string, outputNode: string, roles: [string, string], depth: number, relation?: RewriteRecordLike["relation"]): RewriteRecordLike => ({ rule, sourceNode, outputNode, sourceRole: roles[0], replacementRole: roles[1], depth, ...(relation ? { relation } : {}) });

const A = "fachada.capitel>templo", B = `${A}/friso>portal`, C = `${B}/celda>escena`;
const chainRecords = [rec("T6_ARCH_AS_ARCH", "fachada.capitel", A, ["capitel", "templo"], 1), rec("T7_ORNAMENT_AS_SPACE", `${A}/friso`, B, ["friso", "portal"], 2), rec("T5_BUILDING_AS_ORNAMENT", `${B}/celda`, C, ["celda", "edificio"], 3)];
const chainList = (deepest: number, cover = false): Shape[] => [level(A, 50, 50, 300, [level(B, 100, 100, 180, [level(C, 140, 140, deepest)])]), ...(cover ? [rect(130, 130, 120, 120, ink)] : [])];
const depthOf = (list: Shape[], records: RewriteRecordLike[]) => complexityReport({ list, width: W, height: H, provenance: [{ rewrites: records }] }).rewrites;

describe("rewrite chains: verified substitution, not containment", () => {
  it("a visible capital → temple → portal frieze → scene chain counts three levels", () => {
    expect(depthOf(chainList(80), chainRecords)).toMatchObject({ maxVerifiedDepth: 3, visibleChainsDepth3: 1, verified: 3 });
  });

  it("a hidden miniature at the bottom of the chain does not pass visibleChainsDepth3, nor does a tiny one", () => {
    expect(depthOf(chainList(80, true), chainRecords)).toMatchObject({ maxVerifiedDepth: 2, visibleChainsDepth3: 0 });
    expect(depthOf(chainList(6), chainRecords)).toMatchObject({ maxVerifiedDepth: 2, visibleChainsDepth3: 0 });
  });

  it("three independent transformations of three families do not form a chain", () => {
    const list = [level("a>x", 20, 20, 100), level("b>y", 200, 20, 100), level("c>z", 380, 20, 100)];
    const records = [rec("T5_X", "a", "a>x", ["panel", "edificio"], 1), rec("T6_Y", "b", "b>y", ["capitel", "templo"], 1), rec("T7_Z", "c", "c>z", ["celda", "portal"], 1)];
    expect(depthOf(list, records)).toMatchObject({ maxVerifiedDepth: 1, visibleChainsDepth3: 0, verified: 3 });
  });

  it("R5 (a courtyard that contains a complex) never counts, alone or inside a chain", () => {
    const nested = [rec("R5", "courtyard-1", A, ["patio", "complejo"], 1, "contains"), rec("R5", `${A}/friso`, B, ["patio", "complejo"], 2, "contains"), rec("R5", `${B}/celda`, C, ["patio", "habitacion"], 3, "contains")];
    expect(depthOf(chainList(80), nested)).toMatchObject({ maxVerifiedDepth: 0, verified: 0 });
    const broken = [chainRecords[0], { ...chainRecords[1], relation: "contains" as const }, chainRecords[2]];
    expect(depthOf(chainList(80), broken)).toMatchObject({ maxVerifiedDepth: 1, visibleChainsDepth3: 0 });
  });

  it("one family repeated three times is recursion of the same trick, not a verified chain", () => {
    const ev = (id: string, parentId: string | null): RewriteEvidence => ({ ruleId: "T3_OPENING_AS_PORTAL", sourceId: "", replacementId: id, sourceRole: "ventana", replacementRole: "portal", projectedAreaPx: 900, visibleRatio: 1, semanticChanged: true, relation: "rewrites", parentId, replacedRatio: 1 });
    expect(rewriteComplexity([ev("p1", null), ev("p2", "p1"), ev("p3", "p2")], COMPLEXITY_TUNING.rewrite).maxVerifiedDepth).toBe(1);
  });

  it("an overlay that leaves the source showing is not a replacement", () => {
    const sticker = [rect(50, 50, 300, 300, ink), tagRewrite(group([], [rect(60, 60, 40, 40, ink)], box(50, 50, 300)), "pared>fachada")];
    const ok = depthOf(sticker, [rec("T2_BODY_AS_FACADE", "pared", "pared>fachada", ["pared", "fachada"], 1)]);
    expect(ok.verified).toBe(0);
  });
});

describe("site coverage: the denominator is the declared site, never the scored objects", () => {
  const prism = (x0: number, x1: number, y0: number, y1: number): Vec2[] => [[x0, y0], [x1, y0], [x1, y1], [x0, y1], [x0, y0], [x1, y0], [x1, y1], [x0, y1]];
  const declared: SiteEvidence = { declaredBy: "program", footprintM: { x0: 0, x1: 50, z0: 0, z1: 30, y0: 0, y1: 10 }, corners: prism(20, 580, 20, 380) };
  const buildings = (withOutlier: boolean): Shape[] => tagRoot([rect(40, 40, 160, 160, ink), rect(240, 40, 100, 100, ink), ...(withOutlier ? [rect(500, 300, 60, 60, ink)] : [])], { root: "obra", kind: "building" });
  const fill = (list: Shape[], site: SiteEvidence) => complexityReport({ list, width: W, height: H, provenance: [{ site }] }).coverage.buildings;

  it("a hull derived from the objects is refused", () => {
    const fromObjects = { ...declared, declaredBy: "objects" } as unknown as SiteEvidence;
    expect(() => fill(buildings(true), fromObjects)).toThrow(SiteError);
    expect(() => fill(buildings(true), { ...declared, corners: convexHull([[40, 40], [560, 40], [560, 360], [40, 360]]) })).toThrow(SiteError);
  });

  it("dropping a far building lowers siteFill against the declared site, where an object hull would have raised it", () => {
    const withIt = fill(buildings(true), declared), without = fill(buildings(false), declared);
    expect(without.siteFill!).toBeLessThan(withIt.siteFill!);
    expect(without.hullEfficiency).toBe(withIt.hullEfficiency);
    const objectHull = (pts: Vec2[]) => { const h = convexHull(pts); return h.reduce((s, p, i) => s + p[0] * h[(i + 1) % h.length][1] - h[(i + 1) % h.length][0] * p[1], 0) / 2; };
    const inflated = (160 * 160 + 100 * 100) / objectHull([[40, 40], [340, 40], [340, 200], [40, 200]]);
    expect(inflated).toBeGreaterThan(withIt.siteFill!);
  });

  it("ground and background never count as architecture", () => {
    const list = [rect(0, 0, W, H, ink), ...buildings(false)];
    expect(fill(list, declared).canvasFill).toBeCloseTo(fill(buildings(false), declared).canvasFill, 9);
  });
});
