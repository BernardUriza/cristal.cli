import { describe, expect, it } from "vitest";
import { expandProgram } from "./expand.ts";
import { validateGraph } from "./validate.ts";
import { GrammarError, type ArchitectureProgram, type GrammarErrorCode, type SpaceNode } from "./types.ts";

const base: ArchitectureProgram = { seed: 3, archetype: "palace", rules: [{ rule: "R2", target: "root", params: {} }] };

function codeOf(run: () => unknown): GrammarErrorCode | undefined {
  try {
    run();
  } catch (err) {
    if (err instanceof GrammarError) return err.code;
    throw err;
  }
  return undefined;
}

const node = (id: string, parent?: string): SpaceNode => ({ id, kind: "complex", parent, level: 0, footprint: [10, 10], style: "palace", depth: 0 });

describe("grammar validator", () => {
  it("accepts a valid program", () => {
    expect(codeOf(() => expandProgram(base))).toBeUndefined();
  });

  it.each<[string, ArchitectureProgram, GrammarErrorCode]>([
    ["unknown archetype", { ...base, archetype: "castle" as ArchitectureProgram["archetype"] }, "unknown-archetype"],
    ["unknown rule", { ...base, rules: [{ rule: "R99", target: "root", params: {} }] }, "unknown-rule"],
    ["missing target id", { ...base, rules: [{ rule: "R2", target: "hall-7", params: {} }] }, "unknown-target"],
    ["rule incompatible with target", { ...base, rules: [{ rule: "R4", target: "root", params: {} }] }, "incompatible-target"],
    ["param out of range", { ...base, rules: [{ rule: "R2", target: "root", params: { chambers: 9 } }] }, "bad-param"],
    ["unknown param", { ...base, rules: [{ rule: "R2", target: "root", params: { towers: 2 } }] }, "bad-param"],
    ["non-numeric param", { ...base, rules: [{ rule: "R2", target: "root", params: { chambers: "many" } }] }, "bad-param"],
    [
      "depth exceeded on a self-recursive rule",
      { ...base, rules: [{ rule: "R2", target: "root", params: {} }, ...Array(3).fill({ rule: "R6", target: "hall-1", params: {} })] },
      "depth-exceeded",
    ],
  ])("rejects %s", (_, program, code) => {
    expect(codeOf(() => expandProgram(program))).toBe(code);
  });

  it("rejects a program that exceeds the node budget", () => {
    expect(codeOf(() => expandProgram({ ...base, rules: [{ rule: "R2", target: "root", params: { chambers: 6 } }] }, 5))).toBe("budget-exceeded");
  });

  it("rejects containment cycles and dangling edges", () => {
    expect(codeOf(() => validateGraph({ nodes: [node("a", "b"), node("b", "a")], edges: [] }))).toBe("containment-cycle");
    expect(codeOf(() => validateGraph({ nodes: [node("a"), node("b")], edges: [{ from: "a", to: "b", relation: "contains" }, { from: "b", to: "a", relation: "contains" }] }))).toBe("containment-cycle");
    expect(codeOf(() => validateGraph({ nodes: [node("a")], edges: [{ from: "a", to: "ghost", relation: "connects" }] }))).toBe("dangling-edge");
  });
});
