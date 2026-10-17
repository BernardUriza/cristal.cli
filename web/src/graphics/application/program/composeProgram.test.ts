import { describe, expect, it } from "vitest";
import { GRAMMAR_PROGRAMS } from "../../config/programs-grammar.ts";
import { composeProgram } from "./composeProgram.ts";

const view = { width: 900, height: 700, palette: "friedeberg" as const, azimuth: 0.62 };

describe("composeProgram", () => {
  it.each(Object.entries(GRAMMAR_PROGRAMS))("%s: programa → volúmenes → ornamento with provenance", (_, { program }) => {
    const out = composeProgram(program, view);
    expect(out.stages.map((s) => s.name)).toEqual(["programa", "volúmenes", "ornamento"]);
    for (const s of out.stages) expect(s.shapes.length).toBeGreaterThan(0);
    const rules = String(out.stages[0].provenance?.params.reglas);
    for (const call of program.rules) expect(rules).toContain(`${call.rule}@${call.target}`);
    expect(out.scene.solids.length).toBeGreaterThan(5);
  });

  it("gives every kind its own solid form", () => {
    const city = composeProgram(GRAMMAR_PROGRAMS["ciudad-torres"].program, view).scene;
    const spires = city.solids.filter((s) => s.tag.kind === "tower-roof");
    expect(spires).toHaveLength(3);
    const steps = city.solids.filter((s) => s.id.startsWith("stair-1:step"));
    expect(steps.length).toBeGreaterThan(10);
    const decks = city.solids.filter((s) => s.id.endsWith(":deck"));
    expect(Math.min(...decks.flatMap((d) => d.faces.flatMap((f) => f.points.map((p) => p[1]))))).toBeGreaterThan(5);
  });

  it("is deterministic", () => {
    const p = GRAMMAR_PROGRAMS["templo-patios"].program;
    expect(composeProgram(p, view).stages).toEqual(composeProgram(p, view).stages);
  });
});
