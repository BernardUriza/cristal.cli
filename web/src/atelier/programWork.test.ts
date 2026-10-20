import { describe, expect, it } from "vitest";
import { graphSignature } from "../graphics/application/complexity/topology.ts";
import { direct, override } from "./director.ts";
import { workComplexity, workGraph } from "./manifest.ts";
import { composeWork } from "./work.ts";

const N = {
  city: "una ciudad de torres conectadas por puentes donde vigilan cien ojos",
  palace: "un palacio de salones con habitaciones secretas donde vigila un ojo",
  temple: "un templo de patios sucesivos con un jaguar en el centro",
  labyrinth: "un laberinto de pasillos donde se pierden cinco calacas",
};

describe("programa composition", () => {
  it("is the default; a facade asks for the temple and a single cloister for the patio", () => {
    const pick = (n: string) => direct(n).choices.find((c) => c.decision.field === "composition")!.decision.value;
    expect(pick("algo que no sé nombrar")).toBe("programa");
    expect(pick("la fachada de un templo")).toBe("templo");
    expect(pick("un templo visto de frente")).toBe("templo");
    expect(pick("un claustro único con un ojo")).toBe("patio");
  });

  it("draws the grammar's program inhabited, in traceable stages, with every rewrite recorded", () => {
    const work = composeWork(direct(N.palace, 4), 1200, 900);
    expect(work.stages.map((s) => s.name)).toEqual(["programa", "volúmenes", "ornamento", "habitada"]);
    expect(String(work.stages[0].provenance?.params.reglas)).toContain("R2@root → R6@hall-1 → R5@courtyard-1");
    const records = work.stages.flatMap((s) => s.provenance?.rewrites ?? []);
    expect(new Set(records.map((r) => r.rule))).toEqual(new Set(["T1_COLUMN_AS_BODY", "T2_BODY_AS_FACADE", "T3_OPENING_AS_PORTAL", "T4_INHABITED_FRIEZE"]));
    expect(workComplexity(work).rewrites).toMatchObject({ maxVerifiedDepth: 3, visibleChainsDepth3: 1 });
    expect(composeWork(direct(N.palace, 4), 1200, 900).stages).toEqual(work.stages);
  });

  it("the shape changes with the narration: four archetypes, four topologies", () => {
    const signatures = Object.values(N).map((n) => graphSignature(workGraph(composeWork(direct(n, 2), 600, 450))!));
    expect(new Set(signatures).size).toBe(4);
  });

  it("a program the grammar rejects is replaced by the local reading and the fallback is said", () => {
    const bad = override(direct(N.temple, 5), { field: "program", value: { seed: 5, archetype: "temple", rules: [{ rule: "R4", target: "gallery-9", params: {} }] } }, "a mano");
    const work = composeWork(bad, 600, 450);
    expect(work.program?.rules[0].rule).toBe("R1");
    expect(work.stages[0].provenance?.decision).toContain("la gramática rechazó el programa");
  });
});
