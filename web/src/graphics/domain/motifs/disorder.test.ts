import { describe, expect, it } from "vitest";
import { mulberry32 } from "../../../shared/rng";
import { circle, type Shape } from "../shapes";
import { chooseInterruptions, disorderParams, interrupt, interruptionCount, type DisorderPolicy, type RepeatedItem } from "./disorder";

const policy: DisorderPolicy = { fraction: 0.02, kinds: ["rotate", "omit", "shift"], maxRotateDeg: 20, maxShiftUnits: 0.5 };
const row = (n: number): RepeatedItem[] => Array.from({ length: n }, (_, i) => ({ shape: circle(i * 10, 0, 3, { fill: "#fff" }), pivot: [i * 10, 0] }));

describe("1 % de desorden (Molnár)", () => {
  it("is deterministic for the same seed and differs across seeds", () => {
    const a = chooseInterruptions(400, mulberry32(11), policy);
    expect(chooseInterruptions(400, mulberry32(11), policy)).toEqual(a);
    expect(chooseInterruptions(400, mulberry32(12), policy)).not.toEqual(a);
  });

  it("respects the configured fraction with unique sorted indices", () => {
    for (const n of [10, 50, 200, 1000]) {
      const cuts = chooseInterruptions(n, mulberry32(n), policy);
      expect(cuts.length).toBe(interruptionCount(n, policy.fraction));
      expect(cuts.length).toBeLessThanOrEqual(Math.ceil(n * policy.fraction));
      const idx = cuts.map((c) => c.index);
      expect(new Set(idx).size).toBe(idx.length);
      expect([...idx].sort((x, y) => x - y)).toEqual(idx);
      for (const c of cuts) expect(Math.abs(c.amount)).toBeLessThanOrEqual(c.kind === "rotate" ? 20 : 0.5);
    }
  });

  it("applies omission, rotation and shift only to the chosen indices", () => {
    const items = row(300);
    const { shapes, interrupted } = interrupt(items, mulberry32(4), { ...policy, fraction: 0.03 });
    expect(interrupted.length).toBe(9);
    const omitted = interrupted.filter((c) => c.kind === "omit").length;
    expect(shapes.length).toBe(300 - omitted);
    const groups = shapes.filter((s: Shape) => s.kind === "group");
    expect(groups.length).toBe(interrupted.length - omitted);
    const params = disorderParams("cell", interrupted);
    expect(params.cellInterrupted).toBe(9);
    expect(String(params.cellInterruptedAt).split(",")).toHaveLength(9);
  });

  it("leaves short runs untouched and reports none", () => {
    const { shapes, interrupted } = interrupt(row(10), mulberry32(1), policy);
    expect(interrupted).toEqual([]);
    expect(shapes.every((s) => s.kind === "circle")).toBe(true);
    expect(disorderParams("cell", interrupted).cellInterruptedAt).toBe("none");
  });
});
