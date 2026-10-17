import { describe, expect, it } from "vitest";
import { mulberry32 } from "../../../shared/rng.ts";
import { R1, R2, R3, R4, R5, R6 } from "./rules.ts";
import type { GrammarContext, GrammarRule, SpaceKind, SpaceNode } from "./types.ts";

function ctx(params: GrammarContext["params"] = {}): GrammarContext {
  let k = 0;
  return { rng: mulberry32(1), params, budget: 64, nextId: (kind) => `${kind}-${++k}` };
}

const complex: SpaceNode = { id: "root", kind: "complex", level: 0, footprint: [40, 30], style: "palace", depth: 0 };

function run(rule: GrammarRule, target: SpaceNode, params: GrammarContext["params"] = {}) {
  const out = rule.expand(target, ctx(params));
  const kinds = (k: SpaceKind) => out.nodes.filter((n) => n.kind === k);
  const rel = (r: string) => out.edges.filter((e) => e.relation === r);
  return { out, kinds, rel };
}

describe("grammar productions", () => {
  it("R1: COMPLEX → COURTYARD + 2..4 GALLERY, every gallery faces the courtyard", () => {
    const { kinds, rel } = run(R1, complex, { galleries: 3 });
    expect(kinds("courtyard")).toHaveLength(1);
    expect(kinds("gallery")).toHaveLength(3);
    expect(rel("faces").map((e) => e.to)).toEqual(Array(3).fill(kinds("courtyard")[0].id));
    expect(rel("contains").every((e) => e.from === "root")).toBe(true);
  });

  it("R2: COMPLEX → HALL + 2..6 CHAMBER, chambers connect the hall", () => {
    const { kinds, rel } = run(R2, complex);
    const n = kinds("chamber").length;
    expect(n).toBeGreaterThanOrEqual(2);
    expect(n).toBeLessThanOrEqual(6);
    expect(rel("connects").every((e) => e.to === kinds("hall")[0].id)).toBe(true);
  });

  it("R3: COMPLEX → TOWER + STAIR + 1..3 CHAMBER, stair connects tower, chambers stack", () => {
    const { kinds, rel } = run(R3, complex, { chambers: 3 });
    expect(kinds("tower")).toHaveLength(1);
    expect(rel("connects").some((e) => e.from === kinds("stair")[0].id && e.to === kinds("tower")[0].id)).toBe(true);
    expect(rel("above")).toHaveLength(2);
    expect(kinds("chamber").map((c) => c.level)).toEqual([0, 1, 2]);
  });

  it("R4: GALLERY → GALLERY + BRIDGE + TOWER, bridge connects both and the gallery bridges the tower", () => {
    const gallery: SpaceNode = { id: "gallery-1", kind: "gallery", parent: "root", level: 0, footprint: [20, 3.5], style: "city", depth: 1 };
    const { kinds, rel } = run(R4, gallery);
    const bridge = kinds("bridge")[0];
    const tower = kinds("tower")[0];
    expect(rel("connects").map((e) => `${e.from}>${e.to}`).sort()).toEqual([`${bridge.id}>gallery-1`, `${bridge.id}>${tower.id}`].sort());
    expect(rel("bridges")).toEqual([{ from: "gallery-1", to: tower.id, relation: "bridges" }]);
    expect(bridge.parent).toBe("root");
  });

  it("R5: COURTYARD → COURTYARD + COMPLEX contained in it, scaled down", () => {
    const court: SpaceNode = { id: "courtyard-1", kind: "courtyard", parent: "root", level: 0, footprint: [20, 20], style: "temple", depth: 1 };
    const { kinds, rel } = run(R5, court, { scale: 0.5 });
    expect(kinds("complex")[0].parent).toBe("courtyard-1");
    expect(kinds("complex")[0].footprint).toEqual([10, 10]);
    expect(rel("contains")).toHaveLength(1);
  });

  it("R6: HALL → HALL + 2 GALLERY + COURTYARD, galleries connect hall and courtyard", () => {
    const hall: SpaceNode = { id: "hall-1", kind: "hall", parent: "root", level: 0, footprint: [16, 10], style: "palace", depth: 1 };
    const { kinds, rel } = run(R6, hall);
    expect(kinds("gallery")).toHaveLength(2);
    const court = kinds("courtyard")[0].id;
    for (const g of kinds("gallery")) {
      expect(rel("connects").some((e) => e.from === g.id && e.to === "hall-1")).toBe(true);
      expect(rel("connects").some((e) => e.from === g.id && e.to === court)).toBe(true);
    }
  });
});
