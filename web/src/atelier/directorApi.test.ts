import { describe, expect, it } from "vitest";
import { direct, override, withDirection } from "./director.ts";
import { parseDirection } from "./directorApi.ts";

describe("Pedro's direction", () => {
  it("parses only known fields and marks them as pedro", () => {
    const d = parseDirection({ title: "Patio sin salida", choices: [{ field: "palette", value: "noche", because: "x" }, { field: "mood", value: 1, because: "" }] });
    expect(d?.title).toBe("Patio sin salida");
    expect(d?.choices).toEqual([{ decision: { field: "palette", value: "noche" }, because: "x", source: "pedro" }]);
    expect(parseDirection({ title: "x", choices: [] })).toBeNull();
    expect(parseDirection("nope")).toBeNull();
  });

  it("accepts Pedro's scene and clamps it to the grammar", () => {
    const d = parseDirection({ title: "x", choices: [{ field: "scene", value: { groups: [{ creature: { name: "robot", parts: { cabeza: "craneo", ojos: "ojo", alas: "ojo", cuerpo: "dragon" } }, count: 80, arrangement: "escalera", place: "patio", scale: 1 }], architecture: { courtyard: "grande", heights: "nube" } }, because: "b" }] });
    const scene = d?.choices[0].decision.value as { groups: { count: number; creature: { parts: object } }[]; architecture: { courtyard: string; heights: string } };
    expect(scene.groups[0].count).toBe(24);
    expect(scene.groups[0].creature.parts).toEqual({ cabeza: "craneo", ojos: "ojo" });
    expect(scene.architecture).toMatchObject({ courtyard: "grande", heights: "medio" });
  });

  it("replaces narration and default choices but never a human override", () => {
    const base = override(direct("un templo de noche"), { field: "density", value: 0.9 }, "lo subiste tú");
    const directed = withDirection(base, {
      title: "Otra lectura",
      choices: [
        { decision: { field: "palette", value: "friedeberg" }, because: "pedro ve día", source: "pedro" },
        { decision: { field: "density", value: 0.1 }, because: "pedro lo vacía", source: "pedro" },
      ],
    });
    const by = Object.fromEntries(directed.choices.map((c) => [c.decision.field, c]));
    expect(directed.title).toBe("Otra lectura");
    expect(by.palette.source).toBe("pedro");
    expect(by.palette.decision.value).toBe("friedeberg");
    expect(by.density.source).toBe("humano");
    expect(by.density.decision.value).toBe(0.9);
    expect(directed.choices.filter((c) => c.decision.field === "palette")).toHaveLength(1);
    expect(directed.seed).toBe(base.seed);
  });
});
