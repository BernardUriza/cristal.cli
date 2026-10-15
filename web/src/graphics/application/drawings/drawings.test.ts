import { describe, expect, it } from "vitest";
import { CLOISTER_LAYOUT, CLOISTER_PROGRAM } from "../../config/programs";
import { openingRect } from "../../domain/architecture/mass";
import { pairKey } from "../../domain/architecture/program";
import { composeSheets } from "./index";

const DOOR = pairKey("sala-n1", "gal-n");

function doorFeature(sheets: ReturnType<typeof composeSheets>) {
  const o = sheets.building.plan.openings.find((x) => pairKey(...x.between) === DOOR)!;
  return { opening: o, perSheet: sheets.sheets.map((s) => ({ kind: s.kind, pts: s.features[o.id], projector: s.projector })) };
}

describe("drawings from one building", () => {
  const base = composeSheets(CLOISTER_PROGRAM, CLOISTER_LAYOUT);

  it("produces four sheets whose opening features are the projection of the same world rectangle", () => {
    expect(base.sheets.map((s) => s.kind)).toEqual(["plan", "elevation", "section", "axonometric"]);
    for (const sheet of base.sheets) {
      expect(sheet.list.length).toBeGreaterThan(50);
      for (const o of base.building.plan.openings) {
        const expected = openingRect(base.building.plan, o).map((p) => sheet.projector.toScreen(p));
        expect(sheet.features[o.id]).toEqual(expected);
      }
    }
  });

  it("moves one door in every sheet by exactly its world displacement, and leaves every other opening where it was", () => {
    const moved = composeSheets(CLOISTER_PROGRAM, { ...CLOISTER_LAYOUT, openingOverrides: { [DOOR]: { at: 0.2 } } });
    const a = doorFeature(base);
    const b = doorFeature(moved);
    const dxWorld = -0.3 * 8;
    for (let i = 0; i < a.perSheet.length; i++) {
      const before = a.perSheet[i];
      const after = b.perSheet[i];
      const shift = before.projector.toScreen([dxWorld, 0, 0]);
      const origin = before.projector.toScreen([0, 0, 0]);
      for (let k = 0; k < 4; k++) {
        expect(after.pts[k][0]).toBeCloseTo(before.pts[k][0] + (shift[0] - origin[0]), 6);
        expect(after.pts[k][1]).toBeCloseTo(before.pts[k][1] + (shift[1] - origin[1]), 6);
      }
    }
    for (const o of base.building.plan.openings) {
      if (pairKey(...o.between) === DOOR) continue;
      for (let i = 0; i < 4; i++) expect(moved.sheets[i].features[o.id]).toEqual(base.sheets[i].features[o.id]);
    }
  });

  it("shows the door as a gap in the plan: no poché polygon covers the door's centre at cut height", () => {
    const plan = base.sheets[0];
    const { opening } = doorFeature(base);
    const centre = plan.features[opening.id];
    const cx = (centre[0][0] + centre[1][0]) / 2;
    const cy = (centre[0][1] + centre[1][1]) / 2;
    const poche = plan.list.filter((s) => s.kind === "polygon" && s.style.fill === "#1a1412") as Extract<(typeof plan.list)[number], { kind: "polygon" }>[];
    const inside = (pts: readonly (readonly [number, number])[]) => {
      let hit = false;
      for (let i = 0, j = pts.length - 1; i < pts.length; j = i++) {
        const [xi, yi] = pts[i];
        const [xj, yj] = pts[j];
        if (yi > cy !== yj > cy && cx < ((xj - xi) * (cy - yi)) / (yj - yi) + xi) hit = !hit;
      }
      return hit;
    };
    expect(poche.length).toBeGreaterThan(20);
    expect(poche.some((p) => inside(p.points))).toBe(false);
    const wallMid = plan.projector.toScreen([-7.5, CLOISTER_LAYOUT.cutHeight, -7]);
    expect(poche.some((p) => inside(p.points.map((q) => [q[0] - wallMid[0] + cx, q[1] - wallMid[1] + cy] as const)))).toBe(true);
  });

  it("validates the base building", () => {
    expect(base.report.ok).toBe(true);
  });
});
