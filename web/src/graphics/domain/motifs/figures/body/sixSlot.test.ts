import { describe, expect, it } from "vitest";
import { mulberry32 } from "../../../../../shared/rng.ts";
import { drawCreature } from "../creature.ts";
import { SIX_SLOT_ROOT, sixSlotGraph } from "./sixSlot.ts";

const P = { detail: 1 as const, fill: "#000", ink: "#fff", accent: "#f0f" };

describe("sixSlotGraph", () => {
  it("is one program of the part graph: a pivot and one edge per declared slot, pairs as mirror edges", () => {
    const g = sixSlotGraph({ cabeza: "craneo", ojos: "ojo", manos: "mano", cuerpo: "dragon" });
    expect(g.family).toBe("seis-ranuras");
    expect(g.root).toBe(SIX_SLOT_ROOT);
    expect(g.edges.map((e) => [e.to, Boolean(e.mirror)])).toEqual([["manos", true], ["cabeza", false], ["ojos", true]]);
  });

  it("drawCreature keeps its pieces and reports the edges that placed them", () => {
    const c = drawCreature({ cabeza: "craneo", manos: "mano" }, 100, 300, 200, P, mulberry32(1));
    expect(c.pieces.map((p) => p.part.id.split(".")[0])).toEqual(["manos1:mano", "manos2:mano", "cabeza:craneo"]);
    expect(c.pieces[0].part.anchors.center[0]).toBeCloseTo(100 - 200 * 0.36, 0);
    expect(c.edges.find((e) => e.edge === "pivote.center→manos")!.instances).toEqual(["manos1:mano", "manos2:mano"]);
  });
});
