import { describe, expect, it } from "vitest";
import { mulberry32 } from "../../../../../shared/rng.ts";
import { drawCreature } from "../creature.ts";
import { silhouetteComponents } from "./connectivity.ts";
import { looseGraph, SIX_SLOT_ROOT, sixSlotGraph } from "./sixSlot.ts";

const P = { detail: 1 as const, fill: "#000", ink: "#fff", accent: "#f0f" };

const ROBOT = { cabeza: "craneo", ojos: "ojo", cuerpo: "escalera", manos: "mano" } as const;

const components = silhouetteComponents;

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
