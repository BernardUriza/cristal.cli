import { describe, expect, it } from "vitest";
import { REWRITES } from "../../config/rewrites.ts";
import { mulberry32 } from "../../../shared/rng.ts";
import { MOTIFS } from "../motifs/figures/index.ts";
import { quad, walkParts, type Part } from "../motifs/figures/parts.ts";
import type { Shape, Vec2 } from "../shapes.ts";
import { caryatid } from "./caryatid.ts";
import { facade } from "./facade.ts";
import { inhabitedFrieze } from "./frieze.ts";
import { portal } from "./portal.ts";
import { applyRewrite, rewriteTree, type RewriteEnv, type Rule } from "./rewrite.ts";

const ink = { fill: "#fff", ink: "#000", accent: "#c00", deep: "#004", line: 1, detail: 2 as const };
const env = (seed = 5): RewriteEnv => ({ depth: 0, seed, reason: "prueba", rng: mulberry32(seed), ink });
const box = (id: string, role: Part["role"], geometryId: string, x0: number, y0: number, x1: number, y1: number): Part => ({ id, role, geometryId, anchors: { top: [(x0 + x1) / 2, y0], bottom: [(x0 + x1) / 2, y1] }, mask: quad(x0, y0, x1, y1), children: [] });

function points(shapes: Shape[]): Vec2[] {
  return shapes.flatMap((s): Vec2[] => {
    if (s.kind === "group") return [...(s.clip ?? []), ...points(s.children)];
    if (s.kind === "polygon" || s.kind === "polyline") return s.points;
    if (s.kind === "line") return [s.a, s.b];
    return [];
  });
}

const within = (pts: Vec2[], x0: number, y0: number, x1: number, y1: number) => pts.every(([x, y]) => x >= x0 - 1e-6 && x <= x1 + 1e-6 && y >= y0 - 1e-6 && y <= y1 + 1e-6);

const T1: Rule = { rewrite: REWRITES.T1_COLUMN_AS_BODY, produce: caryatid(MOTIFS.craneo) };
const T2: Rule = { rewrite: REWRITES.T2_BODY_AS_FACADE, produce: facade(17) };
const T3: Rule = { rewrite: REWRITES.T3_OPENING_AS_PORTAL, produce: portal({ frames: 4, miniPx: 1e9 }) };

describe("structural rewrites", () => {
  it("T1 turns a pier into feet-legs-torso-head that keep the pier's base, capital and bounds", () => {
    const pier = box("pilar_1", "support", "pilar", 100, 50, 130, 200);
    pier.anchors = { base: [115, 200], capital: [115, 50] };
    const out = applyRewrite(T1, pier, env());
    if (!("part" in out)) throw new Error(out.skipped);
    expect(out.part.anchors.base).toEqual([115, 200]);
    expect(out.part.anchors.capital).toEqual([115, 50]);
    expect(out.part.children.map((c) => c.geometryId)).toEqual(["pies", "piernas", "torso", "brazos", "craneo"]);
    expect(within(points(out.shapes), 100, 50, 130, 200)).toBe(true);
    expect(out.records[0]).toMatchObject({ operation: "rewrite", rule: "T1_COLUMN_AS_BODY", sourceNode: "pilar_1", depth: 1, seed: 5 });
  });

  it("T2 subdivides a torso into rows of windows, a door at the lower centre and the head as crown", () => {
    const torso = box("criatura_07.torso", "enclosure", "torso", 0, 0, 120, 160);
    const out = applyRewrite({ ...T2 }, torso, env(), [T2]);
    if (!("part" in out)) throw new Error(out.skipped);
    const windows = out.part.children.filter((c) => c.geometryId === "ventana");
    const door = out.part.children.find((c) => c.geometryId === "puerta")!;
    expect(windows.length).toBeGreaterThanOrEqual(6);
    expect(Math.abs(door.anchors.center[0] - 60)).toBeLessThan(1);
    expect(door.anchors.center[1]).toBeGreaterThan(windows.reduce((m, w) => Math.max(m, w.anchors.center[1]), 0));
    expect(out.part.anchors.crown).toEqual([60, 0]);
    expect(out.part.anchors.top).toEqual(torso.anchors.top);
    expect(within(points(out.shapes), 0, 0, 120, 160)).toBe(true);
    expect(out.records[0].outputNode).toBe("criatura_07.torso>fachada");
  });

  it("T3 nests corridors inside an opening until minProjectedPx or maxDepth cuts the recursion", () => {
    const mouth = box("boca", "opening", "boca", 0, 0, 200, 200);
    const deep = applyRewrite(T3, mouth, env());
    if (!("part" in deep)) throw new Error(deep.skipped);
    const depths = deep.records.map((r) => r.depth);
    expect(Math.max(...depths)).toBeLessThanOrEqual(REWRITES.T3_OPENING_AS_PORTAL.constraints.maxDepth);
    expect(depths).toEqual([1, 2, 3]);
    const small = applyRewrite({ ...T3, rewrite: { ...T3.rewrite, constraints: { ...T3.rewrite.constraints, minProjectedPx: 80 } } }, mouth, env());
    if (!("part" in small)) throw new Error(small.skipped);
    expect(small.records.map((r) => r.depth)).toEqual([1]);
    expect(applyRewrite(T3, box("ojo", "opening", "pupila", 0, 0, 5, 5), env())).toEqual({ skipped: "minProjectedPx" });
    expect(applyRewrite(T3, mouth, { ...env(), depth: 3 })).toEqual({ skipped: "maxDepth" });
    expect(deep.shapes[0].kind === "group" && deep.shapes[0].clip).toEqual(mouth.mask);
  });

  it("T3 shortens the corridor so its far door passes the next minimum, and the deepest portal holds a mini-scene", () => {
    const deepest = REWRITES.T3_OPENING_AS_PORTAL.constraints.maxDepth;
    const nextMinPx = REWRITES.T3_OPENING_AS_PORTAL.constraints.minProjectedPx;
    const rule: Rule = { rewrite: REWRITES.T3_OPENING_AS_PORTAL, produce: portal({ frames: 4, miniPx: 1e9, deepest, nextMinPx }) };
    const door = box("puerta", "opening", "puerta", 0, 0, 16, 18);
    const out = applyRewrite(rule, door, { ...env(), depth: 1 });
    if (!("part" in out)) throw new Error(out.skipped);
    expect(out.records.map((r) => r.depth)).toEqual([2, 3]);
    expect(applyRewrite(T3, door, { ...env(), depth: 1 })).toMatchObject({ records: [{ depth: 2 }] });
    const last = applyRewrite(rule, door, { ...env(), depth: 2 });
    expect("part" in last && last.part.geometryId).toBe("mini-escena");
  });

  it("T3 puts a tiny courtyard inside a big portal when a mini composer exists", () => {
    const mini = (seed: number) => ({ shapes: [{ kind: "rect" as const, x: 0, y: 0, w: 10, h: 10, style: { fill: `#${seed % 9}` } }], width: 10, height: 10 });
    const rule: Rule = { rewrite: REWRITES.T3_OPENING_AS_PORTAL, produce: portal({ frames: 4, miniPx: 50, mini }) };
    const out = applyRewrite(rule, box("ventana", "opening", "ventana", 0, 0, 80, 60), env());
    expect("part" in out && out.part.geometryId).toBe("patio-diminuto");
  });

  it("T4 fills one cell in every N of a frieze with a tiny facade or creature", () => {
    const band = box("friso", "connector", "friso", 0, 0, 300, 20);
    const rule: Rule = { rewrite: REWRITES.T4_INHABITED_FRIEZE, produce: inhabitedFrieze({ period: [3, 5], motifs: [MOTIFS.ojo] }) };
    const out = applyRewrite(rule, band, env());
    if (!("part" in out)) throw new Error(out.skipped);
    const cells = out.part.children;
    expect(cells.length).toBeGreaterThanOrEqual(2);
    expect(cells.length).toBeLessThanOrEqual(Math.ceil(15 / 3));
    expect(cells.some((c) => c.geometryId === "mini-fachada")).toBe(true);
    expect(within(points(out.shapes), 0, 0, 300, 20)).toBe(true);
  });

  it("is deterministic per seed and only rewrites matching parts in a tree", () => {
    const tree: Part = { ...box("criatura", "crown", "craneo", 0, 0, 100, 100), children: [box("criatura.boca", "opening", "boca", 20, 60, 80, 90), box("criatura.hueso", "support", "hueso", 0, 0, 10, 10)] };
    const a = rewriteTree(tree, [T2, T3], env(9));
    const b = rewriteTree(tree, [T2, T3], env(9));
    expect(JSON.stringify(a)).toBe(JSON.stringify(b));
    expect(a.rootReplaced).toBe(false);
    expect(a.records[0].sourceNode).toBe("criatura.boca");
    const seen: string[] = [];
    walkParts(tree, (p) => seen.push(p.id));
    expect(seen).toHaveLength(3);
  });
});
