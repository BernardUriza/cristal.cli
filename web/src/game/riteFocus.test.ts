import { describe, expect, it } from "vitest";
import { riteCandidateNodes, riteSummaryLine, riteTargetKind } from "./riteFocus";
import { INITIAL_VERTICAL_SLICE, type VerticalSliceState } from "./VerticalSlice";
import { WORLD_NODES } from "./worldNodes";

function slice(overrides: Partial<VerticalSliceState>): VerticalSliceState {
  return { ...INITIAL_VERTICAL_SLICE, ...overrides };
}

describe("riteTargetKind", () => {
  it("points at consoles until the confession lands", () => {
    expect(riteTargetKind("open_console")).toBe("console");
    expect(riteTargetKind("confess")).toBe("console");
  });

  it("points at glyphs from the invocation step onward", () => {
    expect(riteTargetKind("invoke_glyph")).toBe("glyph");
    expect(riteTargetKind("cross_room")).toBe("glyph");
    expect(riteTargetKind("return_changed")).toBe("glyph");
    expect(riteTargetKind("complete")).toBe("glyph");
  });
});

describe("riteCandidateNodes", () => {
  it("returns only consoles while the rite waits for a confession", () => {
    const candidates = riteCandidateNodes(slice({ step: "open_console" }), WORLD_NODES);
    expect(candidates.length).toBeGreaterThan(0);
    expect(candidates.every((node) => node.kind === "console")).toBe(true);
  });

  it("returns only glyphs once the confession is archived", () => {
    const candidates = riteCandidateNodes(slice({ step: "invoke_glyph", confessed: true }), WORLD_NODES);
    expect(candidates.length).toBeGreaterThan(0);
    expect(candidates.every((node) => node.kind === "glyph")).toBe(true);
  });

  it("excludes the already-invoked glyph after a closed run", () => {
    const candidates = riteCandidateNodes(
      slice({ step: "complete", invokedGlyph: "glyph_moon" }),
      WORLD_NODES
    );
    expect(candidates.every((node) => node.kind === "glyph")).toBe(true);
    expect(candidates.some((node) => node.id === "glyph_moon")).toBe(false);
  });

  it("keeps the invoked glyph when it is the only glyph left", () => {
    const onlyMoon = WORLD_NODES.filter((node) => node.kind !== "glyph" || node.id === "glyph_moon");
    const candidates = riteCandidateNodes(
      slice({ step: "complete", invokedGlyph: "glyph_moon" }),
      onlyMoon
    );
    expect(candidates.map((node) => node.id)).toEqual(["glyph_moon"]);
  });
});

describe("riteSummaryLine", () => {
  it("shows the step position for a fresh rite", () => {
    expect(riteSummaryLine(INITIAL_VERTICAL_SLICE)).toBe("RITO 1/5");
  });

  it("carries the archived phrase and the answering glyph", () => {
    const line = riteSummaryLine(
      slice({
        step: "cross_room",
        confessed: true,
        confessionFragment: "tengo miedo",
        invokedGlyph: "glyph_moon",
      })
    );
    expect(line).toBe("RITO 4/5 · «tengo miedo» · LUNA");
  });

  it("compacts long phrases and counts false doors", () => {
    const line = riteSummaryLine(
      slice({
        step: "return_changed",
        confessed: true,
        confessionFragment: "una frase demasiado larga para caber en el journal",
        falseDoors: 2,
      })
    );
    expect(line).toContain("…»");
    expect(line).toContain("⚠ 2 falsas");
    expect(line.startsWith("RITO 5/5")).toBe(true);
  });

  it("marks a closed run with its tally", () => {
    const line = riteSummaryLine(slice({ step: "complete", completedRuns: 3 }));
    expect(line.startsWith("RITO ✓ · runs 3")).toBe(true);
  });

  it("falls back to the raw glyph id when the node is unknown", () => {
    const line = riteSummaryLine(slice({ step: "cross_room", invokedGlyph: "glyph_perdido" }));
    expect(line).toContain("GLYPH_PERDIDO");
  });
});
