import { describe, expect, it } from "vitest";
import { direct, planOf } from "./director.ts";
import { sceneFor } from "./patioWork.ts";
import { readScene } from "./sceneReader.ts";
import { COLLECTIVE_NOUNS } from "./sceneRules.ts";

describe("readScene", () => {
  it("reads Bernard's eight robots made of skulls and eyes climbing infinite stairs", () => {
    const { scene, because } = readScene("ocho robots hechos de craneos y ojos abiertos que suben escaleras infinitas simulando la IA en las manos del poder");
    const robots = scene.groups[0];
    expect(robots.creature.name).toBe("robot");
    expect(robots.count).toBe(8);
    expect(robots.creature.parts).toMatchObject({ cabeza: "craneo", ojos: "ojo" });
    expect(robots.arrangement).toBe("escalera");
    expect(scene.architecture.courtyard).toBe("grande");
    expect(scene.architecture.heights).toBe("vertiginoso");
    expect(because[0]).toContain("8 robot");
  });

  it("different narrations give different scenes", () => {
    const a = readScene("tres jaguares rodean una fuente en un patio pequeño").scene;
    const b = readScene("una multitud de calacas desfila por un corredor largo").scene;
    expect(a.groups[0]).toMatchObject({ count: 3, arrangement: "circulo" });
    expect(a.architecture.courtyard).toBe("chico");
    expect(b.groups[0]).toMatchObject({ arrangement: "procesion" });
    expect(b.groups[0].count).toBeGreaterThanOrEqual(12);
    expect(b.groups[0].count).toBeLessThanOrEqual(24);
    expect(b.architecture.footprint).toBe("alargado");
  });

  it("falls back to the wall motifs the player toggled", () => {
    expect(readScene("algo", ["sirena"]).scene.groups[0].creature.parts).toEqual({ cuerpo: "sirena" });
  });

  it("a collective noun with no number gives a seeded plural inside its declared range, cited in the reason; a number said wins", () => {
    const monks = readScene("una procesión de monjes con cabeza de máscara rodea a un jaguar gigante en un patio pequeño de noche", [], 1);
    const [lo, hi] = COLLECTIVE_NOUNS[0].range;
    expect(monks.scene.groups[0].creature.name).toBe("guardián");
    expect(monks.scene.groups[0].count).toBeGreaterThanOrEqual(lo);
    expect(monks.scene.groups[0].count).toBeLessThanOrEqual(hi);
    expect(monks.because[0]).toContain(`«procesión» sin número: colectivo, ${lo}–${hi} sembrado → ${monks.scene.groups[0].count}`);
    for (const word of ["procesión", "multitud", "coro", "ejército", "enjambre", "manada", "cortejo", "desfile"]) {
      const g = readScene(`un ${word} de calacas`, [], 3).scene.groups[0];
      const rule = COLLECTIVE_NOUNS.find((r) => r.match.test(word))!;
      expect(g.count, word).toBeGreaterThanOrEqual(rule.range[0]);
      expect(g.count, word).toBeLessThanOrEqual(rule.range[1]);
    }
    expect(readScene("una procesión de doce monjes").scene.groups[0].count).toBe(12);
  });

  it("every figure the narration names gets its own group at its size, and the wall adds no figure nobody named", () => {
    const narration = "una procesión de monjes con cabeza de máscara rodea a un jaguar gigante en un patio pequeño de noche";
    const read = readScene(narration, ["jaguar", "mascara", "sirena"], 1);
    const names = read.scene.groups.map((g) => g.creature.name);
    expect(names).toEqual(["guardián", "jaguar"]);
    expect(read.scene.groups[0].creature.parts.cuerpo).toBe("escalera");
    expect(read.scene.groups[1]).toMatchObject({ count: 1, scale: 1.8, creature: { parts: { cuerpo: "jaguar" } } });
    expect(read.because.join("; ")).toContain("«gigante»: protagonista");
    const plan = planOf(direct(narration, 1));
    expect(plan.motifs).not.toContain("sirena");
    expect(sceneFor(plan).groups.map((g) => g.creature.name)).toEqual(["guardián", "jaguar"]);
  });

  it("«rodea» in any conjugation puts the group in a circle, as «rodean» does", () => {
    for (const verb of ["rodea", "rodean", "rodear", "rodeando", "rodeaban", "rodearon"]) {
      expect(readScene(`una procesión de monjes ${verb} a un jaguar`, [], 1).scene.groups[0].arrangement, verb).toBe("circulo");
    }
    expect(readScene("una procesión de monjes con cabeza de máscara rodea a un jaguar gigante en un patio pequeño de noche", [], 1).because.join("; ")).toContain("van en círculo");
  });

  it("the patio's size is read from the patio, never from a figure's size word: «jaguar gigante en un patio pequeño» is a small patio", () => {
    const read = readScene("una procesión de monjes con cabeza de máscara rodea a un jaguar gigante en un patio pequeño de noche", [], 1);
    expect(read.scene.architecture.courtyard).toBe("chico");
    expect(read.because.join("; ")).toContain("«patio pequeño»");
    expect(readScene("un jaguar gigante en un patio", [], 1).scene.architecture.courtyard).toBe("medio");
    expect(readScene("un templo enorme con un patio chico", [], 1).scene.architecture.courtyard).toBe("chico");
    expect(readScene("un patio enorme con un ojo pequeño", [], 1).scene.architecture.courtyard).toBe("grande");
  });
});
