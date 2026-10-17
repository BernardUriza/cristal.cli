import { describe, expect, it } from "vitest";
import { mulberry32 } from "../../../shared/rng.ts";
import { GRAMMAR_PROGRAMS } from "../../config/programs-grammar.ts";
import { expandProgram } from "./expand.ts";
import { measureTopology } from "./goal.ts";
import { solveLayout } from "./layout.ts";
import { sharedEdge } from "./place.ts";
import { R10, R9 } from "./cityRules.ts";
import { R7 } from "./templeRules.ts";
import { validateGraph } from "./validate.ts";
import { volumesOf } from "./volumes.ts";
import { GrammarError, type ArchitectureProgram, type GrammarContext, type GrammarErrorCode, type GrammarRule, type SpaceKind, type SpaceNode } from "./types.ts";

function ctx(params: GrammarContext["params"] = {}, seed = 1): GrammarContext {
  let k = 0;
  return { rng: mulberry32(seed), params, budget: 64, nextId: (kind) => `${kind}-${++k}` };
}

const root: SpaceNode = { id: "root", kind: "complex", level: 0, footprint: [40, 40], style: "temple", depth: 0 };

function run(rule: GrammarRule, target: SpaceNode, params: GrammarContext["params"] = {}, seed = 1) {
  const out = rule.expand(target, ctx(params, seed));
  const kinds = (k: SpaceKind) => out.nodes.filter((n) => n.kind === k);
  return { out, kinds, rel: (r: string) => out.edges.filter((e) => e.relation === r) };
}

function codeOf(fn: () => unknown): GrammarErrorCode | undefined {
  try {
    fn();
  } catch (err) {
    if (err instanceof GrammarError) return err.code;
    throw err;
  }
  return undefined;
}

describe("R7–R10 productions", () => {
  it("R7: COMPLEX → SANCTUARY + 3..6 SHRINE + RING_GALLERY; shrines reach the ring, the ring surrounds the sanctuary, two shrines differ", () => {
    for (const seed of [1, 2, 3, 4]) {
      const { kinds, rel } = run(R7, root, {}, seed);
      const ring = kinds("ring-gallery")[0];
      const shrines = kinds("shrine");
      expect(shrines.length).toBeGreaterThanOrEqual(3);
      expect(shrines.length).toBeLessThanOrEqual(6);
      expect(kinds("sanctuary")[0].parent).toBe(ring.id);
      for (const s of shrines) expect(rel("connects").some((e) => e.from === s.id && e.to === ring.id)).toBe(true);
      expect(new Set(shrines.slice(0, 2).map((s) => `${s.footprint}:${s.height}`)).size).toBe(2);
    }
  });

  it("R8: three platforms shrinking upward, two stairs between consecutive levels, the sanctuary on the top one", () => {
    const g = expandProgram(GRAMMAR_PROGRAMS["templo-terrazas"].program);
    const layout = solveLayout(g, mulberry32(3));
    const at = new Map(layout.spaces.map((s) => [s.node.id, s]));
    const platforms = g.nodes.filter((n) => n.kind === "platform");
    expect(platforms).toHaveLength(3);
    const area = (id: string) => { const r = at.get(id)!.rect; return (r.x1 - r.x0) * (r.z1 - r.z0); };
    expect(area(platforms[0].id)).toBeGreaterThan(area(platforms[1].id));
    expect(area(platforms[1].id)).toBeGreaterThan(area(platforms[2].id));
    expect(g.nodes.find((n) => n.kind === "sanctuary")!.parent).toBe(platforms[2].id);
    for (const s of g.nodes.filter((n) => n.kind === "stair")) {
      const ends = g.edges.filter((e) => e.from === s.id && e.relation === "connects").map((e) => platforms.findIndex((p) => p.id === e.to)).sort();
      expect(ends[1] - ends[0]).toBe(1);
      const upper = at.get(platforms[ends[1]].id)!;
      expect(sharedEdge(at.get(s.id)!.rect, upper.rect)).toBeGreaterThan(0);
      expect(at.get(s.id)!.y1).toBeCloseTo(upper.y1);
    }
    expect(measureTopology(g).elevationLevels).toBeGreaterThanOrEqual(3);
  });

  it("R9: blocks surround the plaza, each with 1..4 buildings, the street ring connects every block and is circulation, not a mass", () => {
    const city: SpaceNode = { ...root, style: "city" };
    const { kinds, rel } = run(R9, city, { blocks: 4 });
    const ring = kinds("street-ring")[0];
    expect(kinds("plaza")[0].parent).toBe(ring.id);
    for (const b of kinds("block")) {
      const n = kinds("building").filter((x) => x.parent === b.id).length;
      expect(n).toBeGreaterThanOrEqual(1);
      expect(n).toBeLessThanOrEqual(4);
      expect(rel("connects").some((e) => e.from === b.id && e.to === ring.id)).toBe(true);
    }
    const g = expandProgram(GRAMMAR_PROGRAMS["ciudad-manzanas"].program);
    const solids = volumesOf(solveLayout(g, mulberry32(5)), g.edges).filter((v) => v.space.node.kind === "street-ring").flatMap((v) => v.solids);
    expect(solids.length).toBe(4);
    expect(solids.every((s) => s.tag.kind === "floor")).toBe(true);
  });

  it("R10: STREET → JUNCTION + three streets at ≥ 45° apart, junction degree ≥ 3, each street laid on its heading's side", () => {
    const avenue: SpaceNode = { id: "gallery-1", kind: "gallery", parent: "root", level: 0, footprint: [22, 3.5], style: "city", depth: 1 };
    const { kinds, rel } = run(R10, avenue);
    const j = kinds("junction")[0];
    expect(rel("connects").filter((e) => e.from === j.id || e.to === j.id).length).toBeGreaterThanOrEqual(3);
    const headings = kinds("street").map((s) => s.heading!);
    for (let i = 1; i < headings.length; i++) expect(Math.min(Math.abs(headings[i] - headings[i - 1]) % 360, 360 - (Math.abs(headings[i] - headings[i - 1]) % 360))).toBeGreaterThanOrEqual(45);
    const g = expandProgram(GRAMMAR_PROGRAMS["ciudad-ramal"].program);
    const at = new Map(solveLayout(g, mulberry32(7)).spaces.map((s) => [s.node.id, s.rect]));
    for (const s of g.nodes.filter((n) => n.kind === "street")) {
      const jid = g.edges.find((e) => e.from === s.id && e.relation === "connects")!.to;
      const [r, q] = [at.get(s.id)!, at.get(jid)!];
      const side = { 0: r.x0 >= q.x1 - 1e-6, 90: r.z0 >= q.z1 - 1e-6, 180: r.x1 <= q.x0 + 1e-6, 270: r.z1 <= q.z0 + 1e-6 }[s.heading!];
      expect(side, s.id).toBe(true);
    }
  });

  it("a junction under 45° or under degree 3 is a typed error on the final graph", () => {
    const g = expandProgram(GRAMMAR_PROGRAMS["ciudad-ramal"].program);
    const bent = { ...g, nodes: g.nodes.map((n) => (n.id === "street-2" ? { ...n, heading: g.nodes.find((m) => m.id === "street-1")!.heading } : n)) };
    expect(codeOf(() => validateGraph(bent))).toBe("bad-junction");
    expect(codeOf(() => validateGraph({ ...g, edges: g.edges.filter((e) => !(e.to === "junction-1" && e.from === "street-1")).filter((e) => !(e.to === "junction-1" && e.from === "street-2")) }))).toBe("bad-junction");
  });
});

describe("TopologyGoal on the final graph", () => {
  const city = (rules: ArchitectureProgram["rules"], goal?: ArchitectureProgram["goal"]): ArchitectureProgram => ({ seed: 3, archetype: "city", rules, goal });

  it("each new production carries its goal and the final graph meets it", () => {
    for (const name of ["templo-radial", "templo-terrazas", "ciudad-manzanas", "ciudad-ramal"] as const) {
      const g = expandProgram(GRAMMAR_PROGRAMS[name].program);
      expect(Object.keys(g.goal ?? {}).length, name).toBeGreaterThan(0);
      expect(g.topology).toEqual(measureTopology(g));
    }
    const block = expandProgram(GRAMMAR_PROGRAMS["ciudad-manzanas"].program).topology!;
    expect(block.cycles).toBeGreaterThanOrEqual(1);
    expect(block.branchNodes).toBeGreaterThanOrEqual(2);
    expect(block.independentBuildings).toBeGreaterThanOrEqual(4);
  });

  it("a production that cannot meet its goal is rejected with a typed error, not assumed", () => {
    expect(codeOf(() => expandProgram(city([{ rule: "R9", target: "root", params: { blocks: 3, buildings: 1 } }])))).toBe("topology-goal");
    expect(codeOf(() => expandProgram(city([{ rule: "R3", target: "root", params: {} }], { minCycles: 9 })))).toBe("topology-goal");
    expect(codeOf(() => expandProgram(city([{ rule: "R3", target: "root", params: {} }], { minCycles: -1 })))).toBe("bad-param");
  });

  it("the old programs keep no goal and still expand", () => {
    for (const name of ["palacio-secreto", "ciudad-torres", "templo-patios", "laberinto-salones"] as const) {
      expect(expandProgram(GRAMMAR_PROGRAMS[name].program).goal).toEqual({});
    }
  });
});
