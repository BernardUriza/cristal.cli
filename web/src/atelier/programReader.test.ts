import { describe, expect, it } from "vitest";
import { expandProgram } from "../graphics/domain/grammar/expand.ts";
import { readProgram } from "./programReader.ts";

const calls = (n: string) => readProgram(n, 7).program.rules.map((r) => `${r.rule}@${r.target}`);

describe("readProgram", () => {
  it("picks the archetype by declared words and the rule sequence of each one", () => {
    expect(readProgram("una ciudad de torres y puentes", 7).program.archetype).toBe("city");
    expect(readProgram("un palacio de salones con habitaciones secretas", 7).program.archetype).toBe("palace");
    expect(readProgram("un templo de patios sucesivos", 7).program.archetype).toBe("temple");
    expect(readProgram("un laberinto de pasillos donde me pierdo", 7).program.archetype).toBe("labyrinth");
    expect(calls("un palacio")).toEqual(["R2@root", "R6@hall-1", "R5@courtyard-1"]);
    expect(calls("un templo")).toEqual(["R1@root", "R5@courtyard-1", "R1@complex-1"]);
    expect(calls("un laberinto")).toEqual(["R2@root", "R6@hall-1", "R6@hall-1"]);
    expect(calls("una ciudad")).toEqual(["R3@root", "R4@gallery-1", "R4@gallery-1", "R4@gallery-1"]);
  });

  it("quantities and adjectives move params inside each rule's range, and say so", () => {
    const palace = readProgram("un palacio con cinco habitaciones", 7);
    expect(palace.program.rules[0].params).toEqual({ chambers: 5 });
    expect(palace.because.join(" ")).toContain("contaste 5");
    expect(readProgram("un palacio con veinte habitaciones", 7).program.rules[0].params).toEqual({ chambers: 6 });
    expect(readProgram("un templo enorme", 7).program.rules[1].params).toEqual({ scale: 0.75 });
    expect(readProgram("un templo pequeño", 7).program.rules[0].params).toEqual({ galleries: 2 });
    expect(readProgram("una ciudad de dos torres", 7).program.rules.filter((r) => r.rule === "R4")).toHaveLength(1);
  });

  it("without a place word it falls back to the temple, marked as not matched", () => {
    const r = readProgram("algo", 3);
    expect(r.matched).toBe(false);
    expect(r.program.archetype).toBe("temple");
  });

  it("every reading is a program the grammar accepts, and it is deterministic", () => {
    for (const n of ["ciudad", "palacio secreto enorme", "templo pequeño", "laberinto de ocho salones", "nada"]) {
      expect(() => expandProgram(readProgram(n, 11).program)).not.toThrow();
      expect(readProgram(n, 11)).toEqual(readProgram(n, 11));
    }
  });
});
