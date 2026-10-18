import { describe, expect, it } from "vitest";
import type { Group } from "../../config/scene.ts";
import type { CompiledCreature } from "../../domain/motifs/figures/body/program/types.ts";
import { drawCompiled } from "../../domain/motifs/figures/creature.ts";
import { tagRoot } from "../../domain/semantic.ts";
import { mulberry32 } from "../../../shared/rng.ts";
import { complexityReport } from "../complexity/index.ts";
import { memberMaker } from "./miembros.ts";
import { creatureOf } from "./programa.ts";

const W = 1200, H = 900;
const params = { detail: 2 as const, fill: "#111", ink: "#eee", accent: "#c33" };

const monks: Group = {
  creature: { name: "guardián", parts: { cabeza: "mascara", cuerpo: "escalera", manos: "mano" } },
  count: 12, arrangement: "procesion", place: "patio", scale: 1,
  program: { family: "biped", seed: 4242, operations: [{ op: "replace", socket: "torso", motif: "escalera" }, { op: "replace", socket: "head", motif: "mascara" }, { op: "replace", socket: "hand", motif: "mano" }] },
};

const procession = (each: (i: number) => CompiledCreature) => Array.from({ length: 12 }, (_, i) => {
  const drawn = drawCompiled(each(i), 100 + (i % 6) * 190, 400 + Math.floor(i / 6) * 420, 300, params, mulberry32(i + 1));
  return tagRoot(drawn.shapes, { root: `monje-${i}`, kind: "creature" });
}).flat();

const motifsOf = (c: CompiledCreature) => new Set(c.graph.nodes.flatMap((n) => ("motif" in n.kind ? [n.kind.motif] : [])));

describe("members of one group", () => {
  const body = creatureOf(monks);
  const member = memberMaker([body], 1);

  it("a procession of twelve monks reads as distinct monks, not clones (3+ clusters: before the contact fix floating heads counted as extra silhouettes)", () => {
    const clones = complexityReport({ list: procession(() => body.compiled), width: W, height: H }).silhouettes.creatures;
    const varied = complexityReport({ list: procession((i) => member(0, i).compiled), width: W, height: H }).silhouettes.creatures;
    expect(clones.distinctClusters).toBe(1);
    expect(varied.eligibleUnits).toBe(12);
    expect(varied.distinctClusters).toBeGreaterThanOrEqual(3);
    expect(varied.effectiveDiversity).toBeGreaterThan(clones.effectiveDiversity);
  });

  it("every member keeps the group's motifs: mask head, stair torso, hands; only the L3 gaze may add its eye", () => {
    for (let i = 0; i < 12; i++) {
      const c = member(0, i).compiled;
      const own = motifsOf(c);
      expect(c.program.family).toBe("biped");
      for (const m of ["escalera", "mano", "mascara"]) expect(own.has(m)).toBe(true);
      expect([...own].filter((m) => !["escalera", "mano", "mascara"].includes(m)).every((m) => m === "ojo")).toBe(true);
      if (own.has("ojo")) expect(c.graph.applied.some((a) => a.rule === "L3-mirada")).toBe(true);
    }
  });

  it("is deterministic: the same work seed gives the same members, another seed others", () => {
    const again = memberMaker([body], 1);
    const other = memberMaker([body], 2);
    const programs = (m: typeof member) => Array.from({ length: 12 }, (_, i) => JSON.stringify(m(0, i).compiled.program));
    expect(programs(again)).toEqual(programs(member));
    expect(programs(other)).not.toEqual(programs(member));
    expect(new Set(programs(member)).size).toBe(12);
  });
});
