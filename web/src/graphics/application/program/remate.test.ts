import { describe, expect, it } from "vitest";
import { PERCH } from "../../config/figures.ts";
import { GRAMMAR_PROGRAMS } from "../../config/programs-grammar.ts";
import type { Group } from "../../config/scene.ts";
import type { Solid } from "../../domain/architecture/mass.ts";
import type { Vec3 } from "../../domain/math/vec3.ts";
import { groundAxes } from "../framing.ts";
import { composePatio } from "../patio/index.ts";
import { siteOfBuilding, spotsFor, type Site } from "../patio/lugares.ts";
import { programScene } from "./composeProgram.ts";
import { siteOfProgram } from "./site.ts";

const view = { width: 1200, height: 900, palette: "friedeberg" as const, azimuth: 0.62 };
const robots = (count: number): Group => ({ creature: { name: "robot", parts: { cabeza: "craneo", cuerpo: "escalera", manos: "mano" } }, count, arrangement: "fila", place: "torres", scale: 1 });

function inside(poly: readonly Vec3[], x: number, z: number): boolean {
  let hit = false;
  for (let i = 0, j = poly.length - 1; i < poly.length; j = i++) {
    const [a, b] = [poly[i], poly[j]];
    if (a[2] > z !== b[2] > z && x < ((b[0] - a[0]) * (z - a[2])) / (b[2] - a[2]) + a[0]) hit = !hit;
  }
  return hit;
}

const surfaceUnder = (solids: readonly Solid[], at: Vec3) =>
  Math.max(-Infinity, ...solids.flatMap((s) => s.faces).filter((f) => f.normal[1] > 0.99 && f.points[0][1] <= at[1] + PERCH.footTolerance && inside(f.points, at[0], at[2])).map((f) => f.points[0][1]));

function expectStandingInFront(site: Site, solids: readonly Solid[], spires: readonly Solid[]) {
  const { depth } = groundAxes(site.projector.forward);
  const along = (p: Vec3) => p[0] * depth[0] + p[2] * depth[1];
  const tops = spotsFor(robots(site.towers.length), site);
  expect(tops).toHaveLength(site.towers.length);
  for (const at of tops) {
    expect(at[1] - surfaceUnder(solids, at)).toBeLessThanOrEqual(PERCH.footTolerance);
    const gap = (s: Solid) => Math.min(...s.faces.flatMap((f) => f.points).map((p) => Math.hypot(p[0] - at[0], p[2] - at[2])));
    const spire = [...spires].sort((a, b) => gap(a) - gap(b))[0];
    expect(gap(spire)).toBeLessThan(3);
    expect(spire.faces.flatMap((f) => f.points).every((p) => along(p) > along(at))).toBe(true);
  }
}

describe("tower crowns are habitable", () => {
  it("a robot on a city tower stands on the flat ledge at the spire's foot, facing the camera, never floating over the tip", () => {
    const s = programScene(GRAMMAR_PROGRAMS["ciudad-torres"].program, view);
    const site = siteOfProgram(s);
    expect(site.towers.length).toBeGreaterThan(0);
    expect(site.towers.every((t) => t.hole && t.hole.x0 > t.rect.x0 && t.hole.z1 < t.rect.z1)).toBe(true);
    expectStandingInFront(site, s.solids, s.solids.filter((x) => x.id.endsWith(":spire")));
  });

  it("the patio's towers give the same ledge", () => {
    const c = composePatio({ seed: 3, width: 800, height: 600 });
    const site = siteOfBuilding(c.building, c.projector);
    expectStandingInFront(site, c.building.solids, c.building.solids.filter((x) => x.id.startsWith("tower-roof:")));
  });
});
