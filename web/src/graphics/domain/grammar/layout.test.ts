import { describe, expect, it } from "vitest";
import { mulberry32 } from "../../../shared/rng.ts";
import { GRAMMAR_PROGRAMS } from "../../config/programs-grammar.ts";
import { rectContains } from "../architecture/layout.ts";
import { expandProgram } from "./expand.ts";
import { solveLayout, type GraphLayout } from "./layout.ts";
import { overlaps, sharedEdge } from "./place.ts";

function ancestors(layout: GraphLayout, id: string): Set<string> {
  const byId = new Map(layout.spaces.map((s) => [s.node.id, s.node]));
  const out = new Set<string>();
  for (let p = byId.get(id)?.parent; p; p = byId.get(p)?.parent) out.add(p);
  return out;
}

const cases = Object.entries(GRAMMAR_PROGRAMS);

describe("layout solver", () => {
  it.each(cases)("%s: no two unrelated spaces overlap on the same level", (_, { program }) => {
    const graph = expandProgram(program);
    const layout = solveLayout(graph, mulberry32(program.seed));
    const stacked = new Set(graph.edges.filter((e) => e.relation === "above").map((e) => e.from));
    const ground = layout.spaces.filter((s) => !stacked.has(s.node.id));
    for (const a of ground) for (const b of ground) {
      if (a === b || ancestors(layout, a.node.id).has(b.node.id) || ancestors(layout, b.node.id).has(a.node.id)) continue;
      expect(overlaps(a.rect, b.rect), `${a.node.id} × ${b.node.id}`).toBe(false);
    }
  });

  it.each(cases)("%s: contains = inside the parent, above = same rect one storey up", (_, { program }) => {
    const graph = expandProgram(program);
    const layout = solveLayout(graph, mulberry32(program.seed));
    const byId = new Map(layout.spaces.map((s) => [s.node.id, s]));
    for (const s of layout.spaces) if (s.node.parent) expect(rectContains(byId.get(s.node.parent)!.rect, s.rect)).toBe(true);
    for (const e of graph.edges.filter((x) => x.relation === "above")) {
      expect(byId.get(e.from)!.rect).toEqual(byId.get(e.to)!.rect);
      expect(byId.get(e.from)!.y0).toBeCloseTo(byId.get(e.to)!.y1);
    }
  });

  it("faces and bridge links become shared edges", () => {
    const graph = expandProgram(GRAMMAR_PROGRAMS["templo-patios"].program);
    const layout = solveLayout(graph, mulberry32(1));
    const byId = new Map(layout.spaces.map((s) => [s.node.id, s]));
    for (const e of graph.edges.filter((x) => x.relation === "faces")) expect(sharedEdge(byId.get(e.from)!.rect, byId.get(e.to)!.rect)).toBeGreaterThan(2);
    const city = expandProgram(GRAMMAR_PROGRAMS["ciudad-torres"].program);
    const cityLayout = solveLayout(city, mulberry32(2));
    const at = new Map(cityLayout.spaces.map((s) => [s.node.id, s]));
    for (const b of city.nodes.filter((n) => n.kind === "bridge")) {
      const ends = city.edges.filter((e) => e.from === b.id && e.relation === "connects").map((e) => at.get(e.to)!);
      for (const end of ends) expect(sharedEdge(at.get(b.id)!.rect, end.rect)).toBeGreaterThan(0);
    }
  });

  it("is deterministic for a given rng seed", () => {
    const graph = expandProgram(GRAMMAR_PROGRAMS["laberinto-salones"].program);
    expect(solveLayout(graph, mulberry32(9))).toEqual(solveLayout(graph, mulberry32(9)));
  });
});
