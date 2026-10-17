import { describe, expect, it } from "vitest";
import { GRAMMAR_PROGRAMS } from "../../config/programs-grammar.ts";
import { expandProgram } from "./expand.ts";
import type { SpaceGraph } from "./types.ts";

function signature(g: SpaceGraph): string {
  const count = (xs: string[]) => Object.entries(xs.reduce<Record<string, number>>((m, x) => ({ ...m, [x]: (m[x] ?? 0) + 1 }), {})).sort().map(([k, v]) => `${k}:${v}`).join(",");
  return `${count(g.nodes.map((n) => n.kind))}|${count(g.edges.map((e) => e.relation))}`;
}

describe("program expansion", () => {
  it("is deterministic per seed", () => {
    const p = GRAMMAR_PROGRAMS["palacio-secreto"].program;
    expect(expandProgram(p)).toEqual(expandProgram(p));
  });

  it("completes unexpanded complexes with the seeded PRNG and records it", () => {
    const g = expandProgram(GRAMMAR_PROGRAMS["palacio-secreto"].program);
    const completions = g.applied.filter((a) => a.origin === "completion");
    expect(completions.map((a) => a.target)).toEqual(["complex-1"]);
    expect(g.nodes.filter((n) => n.kind === "complex").every((c) => g.edges.some((e) => e.relation === "contains" && e.from === c.id))).toBe(true);
  });

  it("different seeds may change completion but never the explicit program", () => {
    const p = GRAMMAR_PROGRAMS["palacio-secreto"].program;
    const a = expandProgram(p).applied.filter((x) => x.origin === "program");
    const b = expandProgram({ ...p, seed: p.seed + 100 }).applied.filter((x) => x.origin === "program");
    expect(a.map((x) => `${x.rule}@${x.target}`)).toEqual(b.map((x) => `${x.rule}@${x.target}`));
  });

  it("the four test programs give four distinct graph signatures", () => {
    const sigs = Object.values(GRAMMAR_PROGRAMS).map((e) => signature(expandProgram(e.program)));
    expect(new Set(sigs).size).toBe(4);
  });

  it("each topology carries its defining kinds", () => {
    const g = (name: keyof typeof GRAMMAR_PROGRAMS) => expandProgram(GRAMMAR_PROGRAMS[name].program);
    expect(g("ciudad-torres").nodes.filter((n) => n.kind === "tower")).toHaveLength(3);
    expect(g("ciudad-torres").edges.filter((e) => e.relation === "bridges")).toHaveLength(2);
    expect(g("templo-patios").nodes.filter((n) => n.kind === "courtyard")).toHaveLength(2);
    expect(g("templo-patios").nodes.filter((n) => n.kind === "gallery")).toHaveLength(8);
    expect(g("palacio-secreto").nodes.filter((n) => n.kind === "complex" && n.parent?.startsWith("courtyard"))).toHaveLength(1);
    expect(g("laberinto-salones").nodes.filter((n) => n.kind === "gallery")).toHaveLength(4);
  });
});
