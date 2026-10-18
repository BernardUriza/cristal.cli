import { describe, expect, it } from "vitest";
import { direct } from "./director.ts";
import { composeWork } from "./work.ts";

const habitada = (narration: string, seed: number) => composeWork(direct(narration, seed), 1200, 900).stages.find((s) => s.name === "habitada")!;

describe("ATELIER: each figure's provenance records the detail it drew at and why", () => {
  it("mitad jaguar mitad sirena, semilla 7: the creature in front draws rosettes, not the bare contour", () => {
    const p = habitada("mitad jaguar mitad sirena", 7).provenance!;
    const details = Object.entries(p.params).filter(([k]) => k.startsWith("detail_criatura_"));
    expect(details.length).toBeGreaterThan(0);
    expect(Math.max(...details.map(([, v]) => Number(v)))).toBeGreaterThanOrEqual(2);
    expect(p.decision).toMatch(/LOD por tamaño proyectado: criatura_01 detail \d: \d+ px en banda \d/);
  });

  it("a giant protagonist in a long narration reaches detail 3", () => {
    const p = habitada("un jaguar gigante camina solo por un templo de patios sucesivos al amanecer", 7).provenance!;
    expect(Object.entries(p.params).some(([k, v]) => k.startsWith("detail_criatura_") && v === 3)).toBe(true);
  });
});
