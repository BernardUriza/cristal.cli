import { describe, expect, it } from "vitest";
import { CLOISTER_LAYOUT, CLOISTER_PROGRAM } from "../../config/programs";
import { polygonNormal } from "../math/clip";
import { dot, sub, centroid } from "../math/vec3";
import { buildMass, openingRect } from "./mass";
import { buildPlan } from "./plan";

describe("mass", () => {
  const plan = buildPlan(CLOISTER_PROGRAM, CLOISTER_LAYOUT);
  const building = buildMass(plan);

  it("gives every face an outward normal that its winding agrees with (three.js culls by winding)", () => {
    let checked = 0;
    for (const solid of building.solids) {
      const c = centroid(solid.faces.flatMap((f) => f.points));
      for (const f of solid.faces) {
        expect(dot(f.normal, sub(centroid(f.points), c))).toBeGreaterThan(0);
        expect(dot(polygonNormal(f.points), f.normal)).toBeCloseTo(1, 9);
        checked++;
      }
    }
    expect(checked).toBeGreaterThan(100);
  });

  it("leaves a real hole at each door: no wall solid occupies the door span below the lintel", () => {
    const door = plan.openings.find((o) => o.kind === "door" && o.between.includes("sala-n1"))!;
    const rect = openingRect(plan, door);
    const mid = centroid(rect);
    const occupied = building.solids.filter((s) => s.tag.wall === door.wallId && s.tag.kind === "wall").some((s) => {
      const xs = s.faces.flatMap((f) => f.points.map((p) => p[0]));
      return mid[0] > Math.min(...xs) && mid[0] < Math.max(...xs);
    });
    expect(occupied).toBe(false);
    const lintel = building.solids.find((s) => s.tag.opening === door.id && s.tag.kind === "lintel")!;
    expect(Math.min(...lintel.faces.flatMap((f) => f.points.map((p) => p[1])))).toBeCloseTo(door.sill + door.height, 9);
  });

  it("raises tower roofs above every other solid and keeps the courtyard open", () => {
    const top = building.bounds.max[1];
    expect(top).toBeCloseTo(CLOISTER_LAYOUT.heights.tower + CLOISTER_LAYOUT.heights.roofSlab + CLOISTER_LAYOUT.heights.towerRoof, 9);
    expect(building.solids.some((s) => s.tag.space === "patio")).toBe(false);
    expect(building.solids.filter((s) => s.tag.kind === "tower-roof")).toHaveLength(4);
  });
});
