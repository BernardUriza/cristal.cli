import { describe, expect, it } from "vitest";
import { mulberry32 } from "../../../shared/rng.ts";
import { graphSignature } from "../../application/complexity/topology.ts";
import { expandProgram } from "./expand.ts";
import { solveLayout } from "./layout.ts";
import { sharedEdge } from "./place.ts";
import type { ArchitectureProgram, SpaceGraph, SpaceNode } from "./types.ts";
import { volumesOf } from "./volumes.ts";

const SEEDS = [1, 2, 3, 5, 8, 13, 21, 34, 55, 89];

const program = (seed: number, params: Record<string, number> = {}): ArchitectureProgram => ({ seed, archetype: "temple", rules: [{ rule: "R8", target: "root", params }] });

function pyramid(g: SpaceGraph): SpaceNode[] {
  const out: SpaceNode[] = [];
  const site = g.nodes.find((n) => n.kind === "precinct")?.id ?? "root";
  for (let p = g.nodes.find((n) => n.kind === "platform" && n.parent === site && n.heading === undefined); p; p = g.nodes.find((n) => n.kind === "platform" && n.parent === p!.id)) out.push(p);
  return out;
}

describe("R8 stepped pyramid", () => {
  it("bodies shrink upward, every flight joins consecutive bodies on the upper edge's middle and lands on its top", () => {
    for (const seed of SEEDS) {
      const g = expandProgram(program(seed));
      const layout = solveLayout(g, mulberry32(seed));
      const at = new Map(layout.spaces.map((s) => [s.node.id, s]));
      const bodies = pyramid(g);
      expect(bodies.length).toBeGreaterThanOrEqual(3);
      expect(bodies.length).toBeLessThanOrEqual(7);
      const side = (n: SpaceNode) => at.get(n.id)!.rect.x1 - at.get(n.id)!.rect.x0;
      for (let k = 1; k < bodies.length; k++) expect(side(bodies[k])).toBeLessThan(side(bodies[k - 1]));
      expect(g.nodes.find((n) => n.kind === "sanctuary")!.parent).toBe(bodies[bodies.length - 1].id);
      for (const s of g.nodes.filter((n) => n.kind === "stair" && n.parent !== "root")) {
        const upper = at.get(g.edges.find((e) => e.from === s.id && e.relation === "connects")!.to)!;
        const r = at.get(s.id)!.rect;
        expect(sharedEdge(r, upper.rect)).toBeGreaterThan(0);
        const mid = s.heading! % 180 === 0 ? [r.z0 + r.z1, upper.rect.z0 + upper.rect.z1] : [r.x0 + r.x1, upper.rect.x0 + upper.rect.x1];
        expect(mid[0]).toBeCloseTo(mid[1]);
        expect(at.get(s.id)!.y1).toBeCloseTo(upper.y1);
      }
    }
  });

  it("the goal holds on every seed: three levels or more and a building that stands apart from the pyramid", () => {
    for (const seed of SEEDS) {
      const g = expandProgram(program(seed));
      expect(g.topology!.elevationLevels).toBeGreaterThanOrEqual(3);
      expect(g.topology!.independentBuildings).toBeGreaterThanOrEqual(2);
      const altar = g.nodes.find((n) => n.kind === "altar")!;
      expect(g.nodes.find((n) => n.id === altar.parent)!.kind).toBe("plaza");
      expect(g.nodes.some((n) => n.kind === "causeway")).toBe(true);
    }
  });

  it("seeds give several topologies; parameters pin 4 stairways, the adosada, the roof comb and the enclosure", () => {
    expect(new Set(SEEDS.map((s) => graphSignature(expandProgram(program(s))))).size).toBeGreaterThanOrEqual(3);
    const g = expandProgram(program(7, { bodies: 4, stairs: 4, adosada: 1, crest: 1, adoratorios: 0, flancos: 1, recinto: 1 }));
    const enclosure = g.nodes.find((n) => n.kind === "precinct")!;
    expect(g.nodes.filter((n) => n.parent === enclosure.id).map((n) => n.kind)).toEqual(expect.arrayContaining(["platform", "plaza", "altar", "stair"]));
    expect(g.edges).toContainEqual({ from: g.nodes.find((n) => n.kind === "causeway")!.id, to: enclosure.id, relation: "connects" });
    expect(pyramid(g)).toHaveLength(4);
    expect(g.nodes.filter((n) => n.kind === "stair")).toHaveLength(4 * 3 + 4);
    expect(g.nodes.filter((n) => n.kind === "platform" && n.heading !== undefined)).toHaveLength(1);
    const crest = g.nodes.find((n) => n.kind === "crest")!;
    expect(g.edges).toContainEqual({ from: crest.id, to: g.nodes.find((n) => n.kind === "sanctuary")!.id, relation: "above" });
  });

  it("a body is talud, tablero and cornice under its terrace floor; the summit temple has a flat roof, not a dome", () => {
    const g = expandProgram(program(13, { bodies: 3, stairs: 1, crest: 0 }));
    const volumes = volumesOf(solveLayout(g, mulberry32(13)), g.edges);
    const body = volumes.find((v) => v.space.node.kind === "platform")!;
    const parts = body.solids.map((s) => s.id.split(":")[1]);
    expect(parts).toContain("floor");
    expect(parts.some((p) => p === "talud")).toBe(true);
    const temple = volumes.find((v) => v.space.node.kind === "sanctuary")!;
    expect(temple.solids.map((s) => s.id.split(":")[1])).toEqual(["body", "cornice", "roof"]);
  });
});
