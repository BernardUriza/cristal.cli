import { describe, expect, it } from "vitest";
import { GRAMMAR_PROGRAMS } from "../../config/programs-grammar.ts";
import { composePatio } from "../patio/index.ts";
import { siteOfBuilding, spotsFor } from "../patio/lugares.ts";
import { programScene } from "./composeProgram.ts";
import { siteOfProgram } from "./site.ts";

const view = { width: 900, height: 700, palette: "friedeberg" as const, azimuth: 0.62 };
const group = (place: "patio" | "torres" | "azoteas" | "cielo" | "escalera") => ({ creature: { name: "robot", parts: { cuerpo: "escalera" as const } }, count: 4, arrangement: "fila" as const, place, scale: 1 });

describe("siteOfProgram", () => {
  it("stands creatures on the program: empty courtyard, spires, flat roofs, the sky over the whole", () => {
    const s = programScene(GRAMMAR_PROGRAMS["templo-patios"].program, view);
    const site = siteOfProgram(s);
    const court = s.layout.spaces.find((p) => p.rect === site.floor.rect)!;
    expect(court.node.kind).toBe("courtyard");
    expect(s.graph.edges.some((e) => e.relation === "contains" && e.from === court.node.id)).toBe(false);
    expect(site.floor.y).toBeCloseTo(court.y1);
    const top = Math.max(...s.solids.flatMap((x) => x.faces.flatMap((f) => f.points.map((p) => p[1]))));
    expect(spotsFor(group("cielo"), site).every((p) => p[1] > top)).toBe(true);
    expect(site.roofs.length).toBeGreaterThan(0);
  });

  it("towers and stairs of the city become places: on each spire, up the stair flight", () => {
    const s = programScene(GRAMMAR_PROGRAMS["ciudad-torres"].program, view);
    const site = siteOfProgram(s);
    expect(site.towers).toHaveLength(s.graph.nodes.filter((n) => n.kind === "tower").length);
    expect(site.stairs).toHaveLength(1);
    expect(site.stairs[0].to[1]).toBeGreaterThan(site.stairs[0].from[1]);
    const up = spotsFor(group("escalera"), site);
    expect(up[up.length - 1][1]).toBeGreaterThan(up[0][1]);
    expect(spotsFor(group("torres"), site)[0][1]).toBeGreaterThan(15);
  });

  it("the patio adapter keeps the patio's places", () => {
    const c = composePatio({ seed: 3, width: 800, height: 600 });
    const site = siteOfBuilding(c.building, c.projector);
    expect(site.floor.rect).toEqual(c.building.plan.spaces.find((x) => x.kind === "courtyard")!.rect);
    expect(site.stairs).toEqual([]);
    expect(spotsFor(group("escalera"), site).map((p) => p[1])).toEqual([...spotsFor(group("escalera"), site).map((p) => p[1])].sort((a, b) => a - b));
  });
});
