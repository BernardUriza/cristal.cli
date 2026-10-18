import { describe, expect, it } from "vitest";
import { FRAMING } from "../config/framing.ts";
import { GRAMMAR_PROGRAMS } from "../config/programs-grammar.ts";
import type { Group, Scene } from "../config/scene.ts";
import { DEFAULT_ARCHITECTURE } from "../config/scene.ts";
import type { Vec3 } from "../domain/math/vec3.ts";
import { creatureHeightM, spotsFor } from "./patio/lugares.ts";
import { figureHull } from "./patio/poblado.ts";
import { bodyClears } from "./patio/holgura.ts";
import { crowdWantedM } from "./patio/multitud.ts";
import { isProtagonist } from "./patio/protagonista.ts";
import { programScene } from "./program/composeProgram.ts";
import { siteOfProgram } from "./program/site.ts";
import type { Projector } from "./projector.ts";

const view = { width: 1200, height: 900, palette: "friedeberg" as const, azimuth: 0.62 };
const group = (count: number, place: Group["place"], name = "robot"): Group => ({ creature: { name, parts: { cuerpo: "escalera" } }, count, arrangement: "fila", place, scale: 1 });
const sceneOf = (...groups: Group[]): Scene => ({ groups, architecture: DEFAULT_ARCHITECTURE });

function screenBox(points: readonly Vec3[], p: Projector) {
  const s = points.map((x) => p.toScreen(x));
  const xs = s.map((v) => v[0]);
  const ys = s.map((v) => v[1]);
  return { x0: Math.min(...xs), x1: Math.max(...xs), y0: Math.min(...ys), y1: Math.max(...ys) };
}

const solidPoints = (s: ReturnType<typeof programScene>) => s.solids.flatMap((x) => x.faces.flatMap((f) => f.points));

describe("framing", () => {
  it("fits the built work to the canvas inside the declared margin, centred, with no empty half", () => {
    const s = programScene(GRAMMAR_PROGRAMS["templo-terrazas"].program, view);
    const b = screenBox(solidPoints(s), s.projector);
    const usable = 1 - 2 * FRAMING.margin;
    expect(Math.max((b.x1 - b.x0) / (view.width * usable), (b.y1 - b.y0) / (view.height * usable))).toBeGreaterThan(0.97);
    expect(Math.abs((b.y0 + b.y1) / 2 - view.height / 2)).toBeLessThan(view.height * 0.05);
    expect(Math.abs((b.x0 + b.x1) / 2 - view.width / 2)).toBeLessThan(view.width * 0.05);
  });

  it("keeps what flies over the work inside the canvas", () => {
    const program = GRAMMAR_PROGRAMS["templo-patios"].program;
    const sky = sceneOf(group(6, "cielo"));
    const built = programScene(program, view);
    const cast = figureHull(siteOfProgram(built), sky);
    const framed = programScene(program, view, cast);
    const b = screenBox(cast, framed.projector);
    expect(b.y0).toBeGreaterThanOrEqual(0);
    expect(b.x0).toBeGreaterThanOrEqual(0);
    expect(b.x1).toBeLessThanOrEqual(view.width);
  });
});

describe("protagonist", () => {
  const s = programScene(GRAMMAR_PROGRAMS["templo-patios"].program, view);
  const site = siteOfProgram(s);

  it("a lone or giant figure is taller than one of a crowd, and a crowd keeps its scale", () => {
    expect(creatureHeightM(group(1, "patio"), site)).toBeGreaterThan(creatureHeightM(group(8, "patio"), site) * 1.4);
    expect(isProtagonist(group(3, "patio", "gigante"))).toBe(true);
    expect(isProtagonist(group(3, "patio"))).toBe(false);
    expect(crowdWantedM(group(8, "patio"), site)).toBeCloseTo(Math.max(3, (site.span * 0.34) / Math.sqrt(2)));
    expect(creatureHeightM(group(8, "patio"), site)).toBeLessThanOrEqual(crowdWantedM(group(8, "patio"), site));
  });

  it("stands on open ground with its body outside every solid, in courtyards and on terraces", () => {
    for (const name of ["templo-patios", "templo-terrazas", "templo-radial"] as const) {
      const t = siteOfProgram(programScene(GRAMMAR_PROGRAMS[name].program, view));
      const g = { ...group(1, "patio", "gigante"), scale: 1.6 };
      const h = creatureHeightM(g, t);
      const [at] = spotsFor(g, t);
      expect(h).toBeGreaterThan(t.span * 0.34);
      expect(bodyClears(at, h, t.projector.forward, t.obstacles)).toBe(true);
    }
  });

  it("a clearance check that sees a wall through the body fails", () => {
    const t = siteOfProgram(programScene(GRAMMAR_PROGRAMS["templo-terrazas"].program, view));
    const sanctuary = t.obstacles[t.obstacles.length - 1];
    const inside: Vec3 = [(sanctuary.min[0] + sanctuary.max[0]) / 2, sanctuary.min[1], (sanctuary.min[2] + sanctuary.max[2]) / 2];
    expect(bodyClears(inside, 10, t.projector.forward, t.obstacles)).toBe(false);
  });
});
