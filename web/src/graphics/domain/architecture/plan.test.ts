import { describe, expect, it } from "vitest";
import { CLOISTER_LAYOUT, CLOISTER_PROGRAM } from "../../config/programs";
import { rectArea } from "./layout";
import { buildPlan, openingSpan, wallLength } from "./plan";
import { pairKey } from "./program";
import { validatePlan } from "./validate";

describe("cloister plan", () => {
  const plan = buildPlan(CLOISTER_PROGRAM, CLOISTER_LAYOUT);
  const report = validatePlan(plan, CLOISTER_PROGRAM);

  it("places every program space, tiles the footprint exactly and passes every check", () => {
    expect(plan.spaces.map((s) => s.id).sort()).toEqual(CLOISTER_PROGRAM.spaces.map((s) => s.id).sort());
    const covered = plan.spaces.reduce((acc, s) => acc + rectArea(s.rect), 0);
    expect(covered).toBeCloseTo(24 * 22, 9);
    expect(report.geometric).toEqual([]);
    expect(report.architectural.filter((i) => i.level === "error")).toEqual([]);
    expect(report.structural.status).toBe("not-evaluated");
    expect(report.ok).toBe(true);
  });

  it("derives one wall per shared edge and exterior walls for the rest", () => {
    const between = (a: string, b: string) => plan.walls.filter((w) => pairKey(w.left, w.right) === pairKey(a, b));
    expect(between("gal-n", "patio")).toHaveLength(1);
    expect(wallLength(between("gal-n", "patio")[0])).toBeCloseTo(10, 9);
    expect(between("sala-n1", "gal-n")).toHaveLength(1);
    expect(wallLength(between("sala-n1", "gal-n")[0])).toBeCloseTo(8, 9);
    const exteriorOfVestibule = plan.walls.filter((w) => w.left === "vestibulo" && w.right === "exterior");
    expect(exteriorOfVestibule).toHaveLength(1);
    expect(exteriorOfVestibule[0].thickness).toBe(CLOISTER_LAYOUT.walls.exterior);
  });

  it("opens an arcade of several bays toward the courtyard and single doors elsewhere", () => {
    const arches = plan.openings.filter((o) => o.kind === "arch" && pairKey(...o.between) === pairKey("gal-n", "patio"));
    expect(arches.length).toBeGreaterThanOrEqual(3);
    const doors = plan.openings.filter((o) => o.kind === "door");
    expect(doors.length).toBe(CLOISTER_PROGRAM.adjacencies.filter((a) => a.access === "door").length + 1);
    expect(plan.openings.some((o) => o.between.includes("exterior"))).toBe(true);
  });

  it("moves a door when its override changes, and nothing else moves", () => {
    const key = pairKey("sala-n1", "gal-n");
    const moved = buildPlan(CLOISTER_PROGRAM, { ...CLOISTER_LAYOUT, openingOverrides: { [key]: { at: 0.2 } } });
    const find = (p: typeof plan) => {
      const o = p.openings.find((x) => pairKey(...x.between) === key)!;
      return openingSpan(p.walls.find((w) => w.id === o.wallId)!, o).center;
    };
    const before = find(plan);
    const after = find(moved);
    expect(after[1]).toBeCloseTo(before[1], 9);
    expect(after[0]).toBeCloseTo(before[0] - 0.3 * 8, 9);
    const others = (p: typeof plan) => p.openings.filter((x) => pairKey(...x.between) !== key).map((x) => openingSpan(p.walls.find((w) => w.id === x.wallId)!, x).center);
    expect(others(moved)).toEqual(others(plan));
    expect(validatePlan(moved, CLOISTER_PROGRAM).ok).toBe(true);
  });

  it("reports a door pushed past the wall end as a geometric error, not a crash", () => {
    const key = pairKey("sala-n1", "gal-n");
    const broken = buildPlan(CLOISTER_PROGRAM, { ...CLOISTER_LAYOUT, openingOverrides: { [key]: { at: 0.02 } } });
    const report = validatePlan(broken, CLOISTER_PROGRAM);
    expect(report.ok).toBe(false);
    expect(report.geometric.map((i) => i.code)).toContain("opening-outside-wall");
  });
});
