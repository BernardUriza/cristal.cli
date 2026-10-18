import { describe, expect, it } from "vitest";
import { GRAMMAR_PROGRAMS, type GrammarProgramName } from "../../config/programs-grammar.ts";
import type { Group } from "../../config/scene.ts";
import { crowdOn } from "../patio/multitud.ts";
import { crowdNote } from "../patio/nota.ts";
import { spotsFor, type Site } from "../patio/lugares.ts";
import { programScene } from "./composeProgram.ts";
import { siteOfProgram } from "./site.ts";

const view = { width: 1200, height: 900, palette: "friedeberg" as const, azimuth: 0.62 };
const siteOf = (name: GrammarProgramName) => siteOfProgram(programScene(GRAMMAR_PROGRAMS[name].program, view));
const group = (count: number, arrangement: Group["arrangement"], place: Group["place"]): Group => ({ creature: { name: "robot", parts: { cabeza: "craneo" } }, count, arrangement, place, scale: 1 });
const inside = (at: readonly number[], r: { x0: number; x1: number; z0: number; z1: number }) => at[0] >= r.x0 - 1e-6 && at[0] <= r.x1 + 1e-6 && at[2] >= r.z0 - 1e-6 && at[2] <= r.z1 + 1e-6;
const onTop = (site: Site, at: readonly number[]) => site.towers.findIndex((t) => inside(at, t.rect) && Math.abs(at[1] - t.y) < 1e-6);

describe("crowds on towers and in narrow streets", () => {
  it("eight robots on a city of towers: at most one per tower top, the rest on the walkable ground, and the provenance says so", () => {
    const site = siteOf("ciudad-torres");
    const g = group(8, "fila", "torres");
    const spots = spotsFor(g, site);
    const tops = spots.map((at) => onTop(site, at)).filter((i) => i >= 0);
    expect(spots).toHaveLength(8);
    expect(new Set(tops).size).toBe(tops.length);
    expect(tops.length).toBe(site.towers.length);
    const down = spots.filter((at) => onTop(site, at) < 0);
    expect(down.every((at) => site.walks.some((w) => inside(at, w.rect) && Math.abs(at[1] - w.y) < 1e-6))).toBe(true);
    expect(crowdNote(crowdOn(g, site), 8)).toContain(`${site.towers.length} en remates de torre (a lo más uno por remate), ${8 - site.towers.length} al suelo caminable`);
  });

  it("no body ever stands on another's head: no two spots share a column", () => {
    const site = siteOf("ciudad-torres");
    const spots = spotsFor(group(12, "fila", "torres"), site);
    const columns = spots.map((at) => `${at[0].toFixed(2)},${at[2].toFixed(2)}`);
    expect(new Set(columns).size).toBe(columns.length);
  });

  it("a circle in a city of blocks takes the plaza, the widest walk, before any street", () => {
    const site = siteOf("ciudad-manzanas");
    const plazas = site.walks.filter((w) => w.label === "plaza");
    expect(plazas.length).toBeGreaterThan(0);
    const crowd = crowdOn(group(12, "circulo", "patio"), site);
    expect(crowd.spots).toHaveLength(12);
    expect(crowd.ground).toEqual(["plaza"]);
    expect(crowd.regrouped).toBeUndefined();
    expect(crowd.spots.every((at) => plazas.some((w) => inside(at, w.rect)))).toBe(true);
  });

  it("in the branching city of narrow streets a grid becomes a procession along the route instead of shrinking to a human floor", () => {
    const site = siteOf("ciudad-ramal");
    const crowd = crowdOn(group(12, "reticula", "patio"), site);
    expect(crowd.regrouped).toEqual({ from: "reticula", to: "procesion" });
    expect(crowd.spots).toHaveLength(12);
    expect(crowd.heightM).toBeGreaterThan(3);
  });
});
