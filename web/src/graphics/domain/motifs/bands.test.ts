import { describe, expect, it } from "vitest";
import { mulberry32 } from "../../../shared/rng";
import type { Shape, Vec2 } from "../shapes";
import { chevronBand, chevronCells, greca, grecaBand } from "./bands";
import { interruptionCount, type DisorderPolicy } from "./disorder";
import type { Ornament } from "./ornament";

const o: Ornament = { ink: { ink: "#000", a: "#a00", b: "#eee", c: "#00a" }, sw: 1, level: 1, shows: () => true };
const policy: DisorderPolicy = { fraction: 0.04, kinds: ["rotate", "omit", "shift"], maxRotateDeg: 24, maxShiftUnits: 0.45 };

function legacyGreca(x: number, y: number, w: number, h: number, cells: number): Vec2[] {
  const u = w / cells, k = u / 4;
  const pts: Vec2[] = [[x, y + h]];
  for (let i = 0; i < cells; i++) {
    const ox = x + i * u;
    pts.push([ox, y], [ox + 3 * k, y], [ox + 3 * k, y + h * 0.65], [ox + k, y + h * 0.65], [ox + k, y + h * 0.33], [ox + 2 * k, y + h * 0.33], [ox + 2 * k, y + h * 0.5], [ox + 4 * k, y + h * 0.5], [ox + 4 * k, y + h]);
  }
  return pts;
}

describe("bands with Molnár disorder", () => {
  it("without disorder the greca stays one polyline identical to the legacy drawing", () => {
    for (const cells of [1, 3, 7, 40]) {
      const shapes = greca(3.3, -2.1, 57.7, 4.9, cells, o);
      expect(shapes).toHaveLength(2);
      expect(JSON.stringify(shapes[1])).toBe(JSON.stringify({ kind: "polyline", points: legacyGreca(3.3, -2.1, 57.7, 4.9, cells), style: { fill: "none", stroke: "#000", strokeWidth: 1, join: "miter" } }));
    }
  });

  it("a run too short to interrupt draws exactly what no disorder draws", () => {
    const rng = mulberry32(1);
    expect(greca(0, 0, 100, 10, 10, o, { rng, policy })).toEqual(greca(0, 0, 100, 10, 10, o));
    expect(chevronBand(0, 0, 100, 10, 10, o, true, { rng: mulberry32(1), policy })).toEqual(chevronBand(0, 0, 100, 10, 10, o, true));
  });

  it("is deterministic per seed, honours the fraction and reports sorted indices", () => {
    const a = grecaBand(0, 0, 500, 10, 50, o, { rng: mulberry32(11), policy });
    expect(grecaBand(0, 0, 500, 10, 50, o, { rng: mulberry32(11), policy })).toEqual(a);
    expect(grecaBand(0, 0, 500, 10, 50, o, { rng: mulberry32(12), policy })).not.toEqual(a);
    expect(a.params.grecaCells).toBe(50);
    expect(a.params.grecaInterrupted).toBe(interruptionCount(50, policy.fraction));
    const idx = String(a.params.grecaInterruptedAt).split(",").map((s) => Number(s.split(":")[0]));
    expect([...idx].sort((p, q) => p - q)).toEqual(idx);
    const omitted = String(a.params.grecaInterruptedAt).split(",").filter((s) => s.endsWith(":omit")).length;
    expect(a.shapes.length).toBe(1 + 50 - omitted);
  });

  it("chevron cells carry their dot with them and only the chosen cells move", () => {
    const c = chevronCells(0, 0, 500, 10, 50, o, true, { rng: mulberry32(31), policy });
    const cuts = String(c.params.chevronInterruptedAt).split(",");
    expect(c.params.chevronInterrupted).toBe(2);
    const omitted = cuts.filter((s) => s.endsWith(":omit")).length;
    const moved = c.shapes.filter((s: Shape) => s.kind === "group");
    expect(moved).toHaveLength(2 - omitted);
    for (const g of moved) if (g.kind === "group") expect(g.children.map((s) => s.kind)).toEqual(["polygon", "circle"]);
    expect(c.shapes.length).toBe(1 + (50 - 2) * 2 + moved.length);
  });

  it("keeps the legacy params out when no disorder is asked", () => {
    expect(grecaBand(0, 0, 100, 10, 8, o).params).toEqual({ grecaCells: 8 });
    expect(chevronCells(0, 0, 100, 10, 8, o).params).toEqual({ chevronCells: 8 });
  });
});
