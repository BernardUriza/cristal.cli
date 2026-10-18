import { describe, expect, it } from "vitest";
import { readScene } from "./sceneReader.ts";

const familyOf = (narration: string) => readScene(narration).scene.groups.map((g) => [g.creature.name, g.program?.family ?? "seis-ranuras"]);

const reasonFor = (narration: string, name: string) => readScene(narration).because.find((b) => b.includes(` ${name} (`)) ?? "";

describe("the local director picks a body family from the narration's words", () => {
  it("a named animal is a quadruped, people walking are bipeds, a serpent or river undulates, an eye radiates, a mixture is a chimera", () => {
    expect(familyOf("tres perros en el patio")).toEqual([["perro", "quadruped"]]);
    expect(familyOf("una procesión de doce monjes con cabeza de máscara recorre la ciudad de calles")).toEqual([["guardián", "biped"]]);
    expect(familyOf("un laberinto de pasillos donde se pierden cinco calacas")).toEqual([["calaca", "biped"]]);
    expect(familyOf("tres ojos flotan sobre el palacio")).toEqual([["ojo", "radial"]]);
    expect(familyOf("un palacio de salones donde vigila un ojo")).toEqual([["ojo", "seis-ranuras"]]);
    expect(familyOf("dos sirenas nadan junto al río")).toEqual([["sirena", "serpentine"]]);
    expect(familyOf("unos seres hechos de jaguar y ojos")).toEqual([["quimera", "chimera"]]);
  });

  it("each choice cites the word that triggered it", () => {
    expect(reasonFor("tres perros en el patio", "perro")).toContain("familia cuadrúpedo (encontré «perros»: animal nombrado");
    expect(reasonFor("una procesión de doce monjes con cabeza de máscara recorre la ciudad de calles", "guardián")).toContain("familia bípedo (encontré «monjes»");
    expect(reasonFor("tres ojos flotan sobre el palacio", "ojo")).toContain("familia radial (encontré «ojos»");
  });

  it("the family body keeps the group's declared motifs on its sockets", () => {
    const monks = readScene("una procesión de doce monjes con cabeza de máscara recorre la ciudad de calles").scene.groups[0].program!;
    expect(monks.operations).toEqual(expect.arrayContaining([{ op: "replace", socket: "head", motif: "mascara" }, { op: "replace", socket: "torso", motif: "escalera" }]));
  });

  it("groups of one work do not repeat a family when the narration offers another", () => {
    const fams = familyOf("una procesión de monjes rodea a tres perros junto al río donde flotan dos ojos");
    expect(new Set(fams.map((f) => f[1])).size).toBe(fams.length);
  });

  it("when the narration gives no other clue the family repeats and says so", () => {
    const r = readScene("tres robots y cinco calacas");
    expect(r.scene.groups.map((g) => g.program?.family)).toEqual(["biped", "biped"]);
    expect(r.because.join(" ")).toContain("repito familia: la narración no da otra");
  });

  it("a scene word picks a fresh family for a second group whose own word is taken", () => {
    const r = readScene("tres robots y cinco calacas junto al río");
    expect(r.scene.groups.map((g) => g.program?.family)).toEqual(["biped", "serpentine"]);
    expect(r.because.join(" ")).toContain("familia serpentino (encontré «río» en la narración");
    expect(r.because.join(" ")).toContain("no repito bípedo de otro grupo");
  });
});
