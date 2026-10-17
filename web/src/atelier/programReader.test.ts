import { describe, expect, it } from "vitest";
import { expandProgram } from "../graphics/domain/grammar/expand.ts";
import { readProgram } from "./programReader.ts";

const calls = (n: string, seed = 7) => readProgram(n, seed).program.rules.map((r) => `${r.rule}@${r.target}`);

const SEEDS = Array.from({ length: 60 }, (_, i) => i + 1);

const firstRules = (n: string) => SEEDS.map((s) => readProgram(n, s).program.rules[0].rule);

const tally = (xs: string[]) => xs.reduce<Record<string, number>>((m, x) => ({ ...m, [x]: (m[x] ?? 0) + 1 }), {});

describe("readProgram", () => {
  it("picks the archetype by declared words; palace and labyrinth keep their one sequence", () => {
    expect(readProgram("una ciudad de torres y puentes", 7).program.archetype).toBe("city");
    expect(readProgram("un palacio de salones con habitaciones secretas", 7).program.archetype).toBe("palace");
    expect(readProgram("un templo de patios sucesivos", 7).program.archetype).toBe("temple");
    expect(readProgram("un laberinto de pasillos donde me pierdo", 7).program.archetype).toBe("labyrinth");
    expect(calls("un palacio")).toEqual(["R2@root", "R6@hall-1", "R5@courtyard-1"]);
    expect(calls("un laberinto")).toEqual(["R2@root", "R6@hall-1", "R6@hall-1"]);
  });

  it("temple and city draw a declared variant by words and seed: every variant appears and words tilt the draw", () => {
    expect(new Set(firstRules("un templo"))).toEqual(new Set(["R1", "R7", "R8"]));
    expect(new Set(firstRules("una ciudad"))).toEqual(new Set(["R3", "R9", "R10"]));
    const terraced = tally(firstRules("un templo de terrazas con escalinatas que suben a la cima"));
    expect(terraced.R8).toBeGreaterThan(Math.max(terraced.R1 ?? 0, terraced.R7 ?? 0));
    const blocks = tally(firstRules("una ciudad de manzanas y casas alrededor de una plaza"));
    expect(blocks.R9).toBeGreaterThan(Math.max(blocks.R3 ?? 0, blocks.R10 ?? 0));
    const classic = SEEDS.find((s) => readProgram("un templo", s).program.rules[0].rule === "R1")!;
    expect(calls("un templo", classic)).toEqual(["R1@root", "R5@courtyard-1", "R1@complex-1"]);
    const branch = SEEDS.find((s) => readProgram("una ciudad", s).program.rules[0].rule === "R10")!;
    expect(calls("una ciudad", branch)).toEqual(["R10@gallery-1", "R10@street-1", "R3@root"]);
    expect(readProgram("una ciudad", branch).because.join(" ")).toContain("la semilla");
  });

  it("quantities and adjectives move params inside each rule's range, and say so", () => {
    const palace = readProgram("un palacio con cinco habitaciones", 7);
    expect(palace.program.rules[0].params).toEqual({ chambers: 5 });
    expect(palace.because.join(" ")).toContain("contaste 5");
    expect(readProgram("un palacio con veinte habitaciones", 7).program.rules[0].params).toEqual({ chambers: 6 });
    const seedOf = (n: string, rule: string) => SEEDS.find((s) => readProgram(n, s).program.rules[0].rule === rule)!;
    expect(readProgram("un templo enorme", seedOf("un templo enorme", "R1")).program.rules[1].params).toEqual({ scale: 0.75 });
    expect(readProgram("un templo pequeño", seedOf("un templo pequeño", "R1")).program.rules[0].params).toEqual({ galleries: 2 });
    expect(readProgram("un templo con cinco capillas", seedOf("un templo con cinco capillas", "R7")).program.rules[0].params).toEqual({ shrines: 5 });
    expect(readProgram("un templo enorme", seedOf("un templo enorme", "R7")).program.rules[0].params).toEqual({});
    const towers = seedOf("una ciudad de dos torres", "R3");
    expect(readProgram("una ciudad de dos torres", towers).program.rules.filter((r) => r.rule === "R4")).toHaveLength(1);
  });

  it("a variant whose topology goal fails on the final graph falls back to the classic one, and says so", () => {
    const n = "una ciudad de 3 manzanas con 1 casa";
    const seed = SEEDS.find((s) => readProgram(n, s).because.some((b) => b.startsWith("fallback: manzanas")))!;
    expect(seed).toBeDefined();
    const r = readProgram(n, seed);
    expect(r.because.join(" ")).toContain("edificios independientes 3 < 4");
    expect(r.program.rules[0].rule).toBe("R3");
    expect(() => expandProgram(r.program)).not.toThrow();
  });

  it("without a place word it falls back to the temple, marked as not matched", () => {
    const r = readProgram("algo", 3);
    expect(r.matched).toBe(false);
    expect(r.program.archetype).toBe("temple");
  });

  it("every reading is a program the grammar accepts, and it is deterministic", () => {
    for (const n of ["ciudad", "ciudad de calles y cruces", "palacio secreto enorme", "templo pequeño", "templo de terrazas", "laberinto de ocho salones", "nada"]) {
      for (const seed of [1, 2, 3, 5, 8, 11]) {
        expect(() => expandProgram(readProgram(n, seed).program)).not.toThrow();
        expect(readProgram(n, seed)).toEqual(readProgram(n, seed));
      }
    }
  });
});
