import { describe, expect, it } from "vitest";
import { mulberry32 } from "../../../../../shared/rng.ts";
import type { Vec2 } from "../../../shapes.ts";
import { drawCreature } from "../creature.ts";
import { toWorld } from "./frame.ts";
import { unitPolygon } from "./kinds.ts";
import { layoutBody } from "./resolve.ts";
import { looseGraph, SIX_SLOT_ROOT, sixSlotGraph } from "./sixSlot.ts";
import type { BodyGraph } from "./types.ts";

const P = { detail: 1 as const, fill: "#000", ink: "#fff", accent: "#f0f" };

const ROBOT = { cabeza: "craneo", ojos: "ojo", cuerpo: "escalera", manos: "mano" } as const;

function inside(poly: readonly Vec2[], p: Vec2): boolean {
  let hit = false;
  for (let i = 0, j = poly.length - 1; i < poly.length; j = i++) {
    const [a, b] = [poly[i], poly[j]];
    if (a[1] > p[1] !== b[1] > p[1] && p[0] < ((b[0] - a[0]) * (p[1] - a[1])) / (b[1] - a[1]) + a[0]) hit = !hit;
  }
  return hit;
}

function segmentsCross(a: Vec2, b: Vec2, c: Vec2, d: Vec2): boolean {
  const o = (p: Vec2, q: Vec2, r: Vec2) => Math.sign((q[0] - p[0]) * (r[1] - p[1]) - (q[1] - p[1]) * (r[0] - p[0]));
  return o(a, b, c) !== o(a, b, d) && o(c, d, a) !== o(c, d, b);
}

const touch = (p: readonly Vec2[], q: readonly Vec2[]) =>
  p.some((v) => inside(q, v)) || q.some((v) => inside(p, v)) || p.some((a, i) => q.some((c, j) => segmentsCross(a, p[(i + 1) % p.length], c, q[(j + 1) % q.length])));

/** Connected components of the pieces' silhouettes: two pieces join when their outlines overlap. */
function components(g: BodyGraph): number {
  const polys = layoutBody(g).placed.filter((p) => unitPolygon(p.node.kind).length).map((p) => unitPolygon(p.node.kind).map((q) => toWorld(p.frame, q)));
  const seen = new Set<number>();
  let n = 0;
  for (let s = 0; s < polys.length; s++) {
    if (seen.has(s)) continue;
    n++;
    const stack = [s];
    seen.add(s);
    while (stack.length) {
      const i = stack.pop()!;
      polys.forEach((q, j) => {
        if (!seen.has(j) && touch(polys[i], q)) (seen.add(j), stack.push(j));
      });
    }
  }
  return n;
}

describe("sixSlotGraph", () => {
  it("hangs every slot on the trunk: head on the body's top, hands on its sides, eyes on the head, pairs as two mirrored pieces", () => {
    const g = sixSlotGraph(ROBOT);
    expect(g.family).toBe("seis-ranuras");
    expect(g.root).toBe(SIX_SLOT_ROOT);
    expect(g.fit).toBe("bounds");
    expect(g.edges.map((e) => [e.to, Boolean(e.flip)])).toEqual([["cuerpo", false], ["manos-1", true], ["manos-2", false], ["cabeza", false], ["ojos-1", true], ["ojos-2", false]]);
  });

  it("the robot is ONE connected mass; the old fixed offsets left the skull and hands floating (control)", () => {
    expect(components(looseGraph(ROBOT))).toBeGreaterThan(1);
    expect(components(sixSlotGraph(ROBOT))).toBe(1);
    expect(components(sixSlotGraph({ ...ROBOT, pies: "mano", cola: "ojo" }))).toBe(1);
    expect(components(sixSlotGraph({ cabeza: "craneo", manos: "mano" }))).toBe(1);
  });

  it("drawCreature keeps its pieces, stands on its feet and reports the edges that placed them", () => {
    const c = drawCreature({ cabeza: "craneo", manos: "mano" }, 100, 300, 200, P, mulberry32(1));
    expect(c.pieces.map((p) => p.part.id.split(".")[0])).toEqual(["manos-1:mano", "manos-2:mano", "cabeza:craneo"]);
    const left = c.pieces[0].part.anchors.center[0], right = c.pieces[1].part.anchors.center[0];
    expect(left).toBeLessThan(100);
    expect(right).toBeGreaterThan(100);
    expect(c.edges.find((e) => e.edge === "pivote.center→manos-1")!.instances).toEqual(["manos-1:mano"]);
    const robot = drawCreature(ROBOT, 100, 300, 200, P, mulberry32(1));
    const lowest = Math.max(...robot.pieces.flatMap((p) => Object.values(p.part.anchors).map((a) => a[1])));
    expect(lowest).toBeLessThanOrEqual(300 + 1e-6);
    expect(300 - lowest).toBeLessThan(200 * 0.05);
  });
});
