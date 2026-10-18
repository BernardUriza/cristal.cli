import { describe, expect, it } from "vitest";
import { creatureOf } from "../graphics/application/patio/programa.ts";
import { readScene } from "./sceneReader.ts";

const ops = (narration: string) => readScene(narration).scene.groups.map((g) => [g.creature.name, g.program?.operations.map((o) => o.op === "blend" ? `blend ${o.socket} ${o.motif}@${o.region}` : o.op === "caricature" ? `caricature ${o.socket} k${o.k}` : `${o.op} ${o.socket}`)]);

describe("the local director writes blend and caricature from declared words", () => {
  it("«mitad jaguar mitad sirena» is one hybrid figure, not a jaguar and a mermaid", () => {
    const named = ops("una criatura mitad jaguar mitad sirena");
    expect(named).toHaveLength(1);
    expect(named[0][0]).toBe("quimera");
    expect((named[0][1] as string[]).slice(-3)).toEqual(["replace torso", "blend torso sirena@punta", "blend torso sirena@extremidad"]);
    expect(ops("mitad jaguar mitad sirena")).toEqual([["jaguar-sirena", ["replace cuerpo", "replace torso", "blend torso sirena@punta", "blend torso sirena@extremidad"]]]);
  });

  it("«caricatura de» and «exagerado» exaggerate the named creature, and the provenance says the norm and k", () => {
    expect(ops("una caricatura de un perro")).toEqual([["perro", ["replace cuerpo", "caricature torso k1.8"]]]);
    expect(ops("un jaguar exagerado")).toEqual([["jaguar", ["replace cuerpo", "caricature torso k1.6"]]]);
    const r = readScene("un jaguar muy exagerado");
    expect(r.scene.groups[0].program?.operations[1]).toEqual({ op: "caricature", socket: "torso", k: 2.2 });
    expect(r.because.join(" ")).toContain("norma:animales");
    expect(creatureOf(r.scene.groups[0]).label).toContain("caricature torso (jaguar~k");
  });

  it("the hybrid says in its provenance that it did not cross itself", () => {
    const r = readScene("mitad jaguar mitad sirena");
    expect(r.because.join(" ")).toContain("jaguar⊕sirena[punta 1, extremidad 0.3]: sin autocruce");
    expect(creatureOf(r.scene.groups[0]).label).toContain("blend torso (jaguar⊕sirena[punta 1");
  });

  it("a caricature with nobody named is left out and said", () => {
    expect(readScene("algo exagerado").because.join(" ")).toContain("no nombraste a quién");
  });
});
