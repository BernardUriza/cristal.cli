import { describe, expect, it } from "vitest";
import { mulberry32 } from "../../../shared/rng.ts";
import type { Rect } from "../architecture/layout.ts";
import { boundsOf } from "../math/vec3.ts";
import { BANQUETTE } from "./dimensions.ts";
import { expandProgram } from "./expand.ts";
import { checkGates, gatesOf } from "./gates.ts";
import { solveLayout } from "./layout.ts";
import { overlaps } from "./place.ts";
import { precinct } from "./pyramidVolumes.ts";
import type { ArchitectureProgram } from "./types.ts";
import { volumesOf } from "./volumes.ts";

const SEEDS = [1, 2, 3, 5, 8, 13, 21, 34, 55, 89];

const program = (seed: number, stairs: number): ArchitectureProgram => ({ seed, archetype: "temple", rules: [{ rule: "R8", target: "root", params: { recinto: 1, stairs } }] });

const planOf = (points: readonly (readonly number[])[]): Rect => {
  const b = boundsOf(points.map((p) => [p[0], p[1], p[2]] as const));
  return { x0: b.min[0], x1: b.max[0], z0: b.min[2], z1: b.max[2] };
};

/** The causeway pushed through the banquette ring: the strip it must cross to reach the enclosure's floor. */
function passage(c: Rect, enc: Rect): Rect {
  const d = BANQUETTE.width;
  if (Math.abs(c.z1 - enc.z0) < 1e-6) return { ...c, z0: enc.z0, z1: enc.z0 + d };
  if (Math.abs(c.z0 - enc.z1) < 1e-6) return { ...c, z0: enc.z1 - d, z1: enc.z1 };
  if (Math.abs(c.x1 - enc.x0) < 1e-6) return { ...c, x0: enc.x0, x1: enc.x0 + d };
  return { ...c, x0: enc.x1 - d, x1: enc.x1 };
}

describe("the Ciudadela opens a gate on its approach", () => {
  it("on every seed and stairway count the causeway meets a gate on the front stairway's axis and no banquette stands in its way", () => {
    for (const seed of SEEDS) for (const stairs of [1, 2, 3]) {
      const g = expandProgram(program(seed, stairs));
      const layout = solveLayout(g, mulberry32(seed));
      const enc = layout.spaces.find((s) => s.node.kind === "precinct")!;
      const way = layout.spaces.find((s) => s.node.kind === "causeway")!;
      const gates = gatesOf(enc, layout.spaces, g.edges);
      const walls = volumesOf(layout, g.edges).find((v) => v.space === enc)!.solids.filter((s) => s.tag.kind === "wall").map((s) => planOf(s.faces.flatMap((f) => f.points)));
      expect(walls.some((w) => overlaps(w, passage(way.rect, enc.rect)))).toBe(false);
      const front = layout.spaces.find((s) => s.node.parent === enc.node.id && s.node.kind === "stair" && s.node.heading === way.node.heading)!;
      const mid = (r: Rect) => (way.node.heading! % 180 === 90 ? (r.x0 + r.x1) / 2 : (r.z0 + r.z1) / 2);
      expect(Math.abs(mid(way.rect) - mid(front.rect))).toBeLessThan(1e-6);
      for (const st of layout.spaces.filter((s) => s.node.parent === enc.node.id && s.node.kind === "stair")) expect(gates.some((x) => x.serves.includes(st.node.id))).toBe(true);
    }
  });

  it("the old closed ring walls the causeway in (control), and the layout rejects a causeway that lands on a corner", () => {
    const g = expandProgram(program(3, 1));
    const layout = solveLayout(g, mulberry32(3));
    const enc = layout.spaces.find((s) => s.node.kind === "precinct")!;
    const way = layout.spaces.find((s) => s.node.kind === "causeway")!;
    const closed = precinct(enc).filter((s) => s.tag.kind === "wall").map((s) => planOf(s.faces.flatMap((f) => f.points)));
    expect(closed.some((w) => overlaps(w, passage(way.rect, enc.rect)))).toBe(true);
    const horizontal = way.node.heading! % 180 === 90;
    const corner = horizontal ? { ...way.rect, x0: enc.rect.x0, x1: enc.rect.x0 + (way.rect.x1 - way.rect.x0) } : { ...way.rect, z0: enc.rect.z0, z1: enc.rect.z0 + (way.rect.z1 - way.rect.z0) };
    const moved = layout.spaces.map((s) => (s === way ? { ...s, rect: corner } : s));
    expect(() => checkGates(moved, g.edges)).toThrow(/blocked-gate/);
  });
});
