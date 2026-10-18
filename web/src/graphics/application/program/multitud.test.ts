import { describe, expect, it } from "vitest";
import { PALETTES } from "../../config/palettes.ts";
import { GRAMMAR_PROGRAMS, type GrammarProgramName } from "../../config/programs-grammar.ts";
import { ARRANGEMENTS, DEFAULT_ARCHITECTURE, type Group } from "../../config/scene.ts";
import { bodyClears } from "../patio/holgura.ts";
import { creatureHeightM, spotsFor } from "../patio/lugares.ts";
import { poblado } from "../patio/poblado.ts";
import { programScene } from "./composeProgram.ts";
import { siteOfProgram } from "./site.ts";

const view = { width: 1200, height: 900, palette: "friedeberg" as const, azimuth: 0.62 };
const monks = (count: number, arrangement: Group["arrangement"]): Group => ({ creature: { name: "monje", parts: { cabeza: "mascara" } }, count, arrangement, place: "patio", scale: 1 });
const siteOf = (name: GrammarProgramName) => siteOfProgram(programScene(GRAMMAR_PROGRAMS[name].program, view));
const inside = (at: readonly number[], r: { x0: number; x1: number; z0: number; z1: number }) => at[0] >= r.x0 - 1e-6 && at[0] <= r.x1 + 1e-6 && at[2] >= r.z0 - 1e-6 && at[2] <= r.z1 + 1e-6;

describe("crowds walk the program's ground", () => {
  it("in the branching city of streets no monk of any arrangement stands inside a building", () => {
    const site = siteOf("ciudad-ramal");
    for (const arrangement of ARRANGEMENTS.filter((a) => a !== "escalera")) {
      const g = monks(12, arrangement);
      const h = creatureHeightM(g, site);
      const spots = spotsFor(g, site);
      expect(spots.length).toBeGreaterThan(0);
      expect(spots.filter((at) => !bodyClears(at, h, site.projector.forward, site.obstacles))).toEqual([]);
    }
  });

  it("the city's walkable ground is its streets and crossings, and a procession of twelve walks on them", () => {
    const site = siteOf("ciudad-ramal");
    expect(new Set(site.walks.map((w) => w.label))).toEqual(new Set(["calle", "cruce"]));
    const spots = spotsFor(monks(12, "procesion"), site);
    expect(spots).toHaveLength(12);
    expect(spots.every((at) => site.walks.some((w) => inside(at, w.rect) && Math.abs(at[1] - w.y) < 1e-6))).toBe(true);
  });

  it("towers, plaza, rings and terraces: every crowd body clears every solid", () => {
    for (const name of Object.keys(GRAMMAR_PROGRAMS) as GrammarProgramName[]) {
      const site = siteOf(name);
      for (const arrangement of ["fila", "procesion", "circulo", "reticula"] as const) {
        const g = monks(12, arrangement);
        const h = creatureHeightM(g, site);
        expect(spotsFor(g, site).filter((at) => !bodyClears(at, h, site.projector.forward, site.obstacles)), `${name} ${arrangement}`).toEqual([]);
      }
    }
  });

  it("the city of towers walks the platforms left along its masses", () => {
    const site = siteOf("ciudad-torres");
    expect(site.walks.length).toBeGreaterThan(0);
    expect(site.walks.every((w) => w.label === "andén")).toBe(true);
  });

  it("when the ground cannot hold the whole crowd it shrinks or thins it and says so, never inside a building", () => {
    const site = siteOf("templo-radial");
    const g = monks(12, "circulo");
    const placed = poblado(site, { groups: [g], architecture: DEFAULT_ARCHITECTURE }, PALETTES.friedeberg, 1, 3);
    const h = creatureHeightM(g, site);
    expect(placed.items.length).toBeLessThan(12);
    expect(placed.items.length).toBeGreaterThan(0);
    expect(spotsFor(g, site).every((at) => bodyClears(at, h, site.projector.forward, site.obstacles))).toBe(true);
    expect(placed.provenance.decision).toMatch(new RegExp(`sitio no alcanza: ${placed.items.length} de 12, escala`));
  });
});
