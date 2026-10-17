import { describe, expect, it } from "vitest";
import { parseDirection } from "./directorApi.ts";
import { MAX_RULE_CALLS, parseProgram } from "./programApi.ts";

const palace = { archetype: "palace", rules: [{ rule: "R2", target: "root", params: { chambers: 4 } }, { rule: "R6", target: "hall-1", params: {} }] };

describe("Pedro's program", () => {
  it("keeps a program the grammar expands, under the request's seed", () => {
    const d = parseDirection({ title: "x", choices: [{ field: "program", value: palace, because: "un palacio" }, { field: "composition", value: "programa", because: "c" }] }, 42);
    expect(d?.choices.map((c) => c.decision.field)).toEqual(["program", "composition"]);
    expect(d?.choices[0].decision.value).toEqual({ seed: 42, ...palace });
  });

  it("discards the whole program on any grammar error, never guesses a fix", () => {
    expect(parseProgram({ ...palace, archetype: "castle" }, 1)).toBeNull();
    expect(parseProgram({ archetype: "palace", rules: [{ rule: "R9", target: "root", params: {} }] }, 1)).toBeNull();
    expect(parseProgram({ archetype: "palace", rules: [{ rule: "R4", target: "root", params: {} }] }, 1)).toBeNull();
    expect(parseProgram({ archetype: "palace", rules: [{ rule: "R6", target: "hall-7", params: {} }] }, 1)).toBeNull();
    expect(parseProgram({ archetype: "palace", rules: [{ rule: "R2", target: "root", params: { chambers: 40 } }] }, 1)).toBeNull();
    expect(parseProgram({ archetype: "palace", rules: [{ rule: "R2", target: "root", params: { chambers: "muchas" } }] }, 1)).toBeNull();
    expect(parseProgram({ archetype: "city", rules: Array.from({ length: MAX_RULE_CALLS + 1 }, () => ({ rule: "R4", target: "gallery-1", params: {} })) }, 1)).toBeNull();
    expect(parseDirection({ title: "x", choices: [{ field: "program", value: { archetype: "palace", rules: "R2" }, because: "" }] })).toBeNull();
  });
});
