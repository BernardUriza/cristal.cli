import { describe, expect, it } from "vitest";
import { mulberry32 } from "../../../../../shared/rng.ts";
import { polygonBounds } from "../../../bezier.ts";
import { expandBody } from "./expand.ts";
import { layoutBody, resolveBody } from "./resolve.ts";
import type { BodyGraph } from "./types.ts";

const P = { detail: 1 as const, fill: "#000", ink: "#fff", accent: "#f0f" };

const twoArms: BodyGraph = {
  family: "biped",
  root: "t",
  fit: "bounds",
  nodes: [
    { id: "t", kind: { primitive: "barrel" }, role: "enclosure", scale: 1, depth: 0 },
    { id: "a", kind: { primitive: "capsule" }, role: "span", scale: 0.8, depth: 1 },
    { id: "m", kind: { motif: "mano" }, role: "span", scale: 0.7, depth: 2 },
  ],
  edges: [
    { from: "t", socket: "right", to: "a", joint: "top", angle: 50, mirror: true },
    { from: "a", socket: "bottom", to: "m", joint: "bottom" },
  ],
  applied: [],
  fallbacks: [],
};

describe("resolveBody", () => {
  it("mirror edges produce reflected pairs across the parent axis, down the whole subtree", () => {
    const placed = layoutBody(twoArms).placed;
    const by = (name: string) => placed.find((p) => p.name === name)!.frame;
    for (const id of ["a", "m"]) {
      const left = by(`${id}1:${id === "a" ? "capsule" : "mano"}`), right = by(`${id}2:${id === "a" ? "capsule" : "mano"}`);
      expect(left.o[0]).toBeCloseTo(-right.o[0], 9);
      expect(left.o[1]).toBeCloseTo(right.o[1], 9);
      expect(left.rot).toBeCloseTo(-right.rot, 9);
      expect(left.flip).toBe(!right.flip);
    }
  });

  it("children inherit the transform of the parent socket: the hand sits at the end of the arm", () => {
    const body = resolveBody(twoArms, 0, 0, 300, P, mulberry32(1));
    const arm = body.pieces.find((p) => p.instance === "a2:capsule")!.part;
    const hand = body.pieces.find((p) => p.instance === "m2:mano")!.part;
    const end = polygonBounds(arm.mask!);
    const handBox = polygonBounds(hand.mask!);
    expect(handBox.minX).toBeGreaterThan((end.minX + end.maxX) / 2);
    expect(handBox.maxY).toBeGreaterThan(end.maxY - 1);
  });

  it("returns provenance per edge with every instance it produced", () => {
    const body = resolveBody(twoArms, 0, 0, 300, P, mulberry32(1));
    expect(body.edges.map((e) => e.edge)).toEqual(["t.right→a", "a.bottom→m"]);
    expect(body.edges[0]).toMatchObject({ mirrored: true, copies: 1, instances: ["a1:capsule", "a2:capsule"] });
  });

  it("every family fits its height above the foot and its width inside the creature box", () => {
    for (const family of ["biped", "quadruped", "serpentine", "radial", "chimera"] as const) {
      const body = resolveBody(expandBody({ seed: 9, family }), 500, 400, 200, P, mulberry32(2));
      const b = polygonBounds(body.pieces.flatMap((p) => p.part.mask ?? []));
      expect(b.maxY).toBeLessThanOrEqual(400 + 1);
      expect(b.minY).toBeGreaterThanOrEqual(400 - 200 - 40);
      expect(b.maxX - b.minX).toBeLessThanOrEqual(200 * 1.3);
    }
  });

  it("recursion unrolls into decaying copies, the subtree hangs from the last one", () => {
    const g = expandBody({ seed: 1, family: "serpentine" });
    const body = resolveBody(g, 0, 0, 200, P, mulberry32(1));
    const chain = body.edges.find((e) => e.copies > 1)!;
    expect(chain.instances.length).toBe(chain.copies);
    const widths = chain.instances.map((name) => {
      const b = polygonBounds(body.pieces.find((p) => p.instance === name)!.part.mask!);
      return b.maxX - b.minX;
    });
    expect(widths.length).toBeGreaterThan(5);
    widths.slice(1).forEach((w, i) => expect(w).toBeLessThan(widths[i]));
    expect(body.pieces.some((p) => p.instance.startsWith("foot-1"))).toBe(true);
  });
});
