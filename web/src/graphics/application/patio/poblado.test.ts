import { describe, expect, it } from "vitest";
import { PALETTES } from "../../config/palettes.ts";
import { DEFAULT_ARCHITECTURE, type Scene } from "../../config/scene.ts";
import { composePatio } from "./index.ts";
import { poblado } from "./poblado.ts";

const robots: Scene = {
  groups: [{ creature: { name: "robot", parts: { cabeza: "craneo", ojos: "ojo", cuerpo: "escalera" } }, count: 8, arrangement: "escalera", place: "patio", scale: 1 }],
  architecture: DEFAULT_ARCHITECTURE,
};

describe("poblado", () => {
  it("places every creature of every group and says what it placed", () => {
    const c = composePatio({ seed: 3, width: 800, height: 600 });
    const s = poblado(c, robots, PALETTES.friedeberg, 1, 3);
    expect(s.items).toHaveLength(8);
    expect(s.items.flatMap((i) => i.shapes).length).toBeGreaterThan(8 * 3);
    expect(s.provenance?.params.figuras).toBe(8);
    expect(s.provenance?.decision).toContain("8 robot");
  });

  it("the architecture changes with the scene: a big courtyard is wider than a small one", () => {
    const small = composePatio({ seed: 3, architecture: { ...DEFAULT_ARCHITECTURE, courtyard: "chico" } }).building.bounds;
    const big = composePatio({ seed: 3, architecture: { footprint: "alargado", courtyard: "grande", heights: "vertiginoso" } }).building.bounds;
    expect(big.max[0] - big.min[0]).toBeGreaterThan(small.max[0] - small.min[0] + 10);
    expect(big.max[1]).toBeGreaterThan(small.max[1] * 1.5);
  });
});
