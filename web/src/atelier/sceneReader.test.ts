import { describe, expect, it } from "vitest";
import { readScene } from "./sceneReader.ts";

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
    expect(b.groups[0]).toMatchObject({ count: 24, arrangement: "procesion" });
    expect(b.architecture.footprint).toBe("alargado");
  });

  it("falls back to the wall motifs the player toggled", () => {
    expect(readScene("algo", ["sirena"]).scene.groups[0].creature.parts).toEqual({ cuerpo: "sirena" });
  });
});
