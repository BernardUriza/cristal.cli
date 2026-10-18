import { describe, expect, it } from "vitest";
import { mulberry32 } from "../../../shared/rng.ts";
import { DETAIL_LOD, figureCap } from "../../config/detail.ts";
import { MORPH_POLICY } from "../../config/morph.ts";
import { pointInPolygon } from "../../domain/bezier.ts";
import { detailAt } from "../../domain/lod.ts";
import { compileProgram, fromSixSlot } from "../../domain/motifs/figures/body/program/compile.ts";
import type { CreatureOp, CreatureProgram } from "../../domain/motifs/figures/body/program/types.ts";
import { drawCompiled } from "../../domain/motifs/figures/creature.ts";
import { renamePart } from "../../domain/motifs/figures/parts.ts";
import type { Shape } from "../../domain/shapes.ts";
import { detailBand } from "../complexity/bands.ts";
import { habitar, trunkPart } from "./habitar.ts";
import { figureLod, lodNote } from "./lodFigura.ts";

const ACCENT = "#c00";
const ink = { fill: "#fff", ink: "#000", accent: ACCENT, deep: "#004", line: 1, detail: 3 as const };
const JAGUAR_SIRENA: CreatureOp[] = [
  { op: "blend", socket: "torso", motif: "sirena", region: "punta", weight: 1 },
  { op: "blend", socket: "torso", motif: "sirena", region: "extremidad", weight: 0.3 },
];

function jaguar(heightPx: number, cap: 1 | 2 | 3 = 3, seed = 7, ops: CreatureOp[] = []) {
  const base = fromSixSlot({ cuerpo: "jaguar" });
  const program: CreatureProgram = { ...base, seed, operations: [...base.operations, ...ops] };
  const params = { detail: cap, lodPx: DETAIL_LOD.bandsPx, fill: "#fff", ink: "#000", accent: ACCENT };
  return drawCompiled(compileProgram(program, MORPH_POLICY), 400, 600, heightPx, params, mulberry32(seed));
}

const rosettes = (shapes: Shape[]) => shapes.filter((s): s is Extract<Shape, { kind: "circle" }> => s.kind === "circle" && s.style.fill === ACCENT);

describe("LOD por tamaño proyectado", () => {
  it("uses the complexity report's band cuts: band 0 and 1 draw detail 1, band 2 detail 2, band 3 detail 3", () => {
    expect(DETAIL_LOD.bandsPx).toEqual([8, 32, 128]);
    for (const px of [0, 4, 7.9, 8, 20, 31.9, 32, 90, 127.9, 128, 640]) expect(detailAt(px, DETAIL_LOD.bandsPx, 3).detail).toBe(Math.max(1, detailBand(px)));
  });

  it("a big jaguar draws detail 3 with rosettes and pelt; a tiny one draws detail 1, contour and eye only", () => {
    const big = jaguar(420);
    expect(big.pieces[0].lod?.detail).toBe(3);
    expect(rosettes(big.shapes).length).toBeGreaterThan(10);
    const tiny = jaguar(12);
    expect(tiny.pieces[0].lod?.detail).toBe(1);
    expect(rosettes(tiny.shapes)).toHaveLength(0);
    expect(big.shapes.length).toBeGreaterThan(tiny.shapes.length * 10);
  });

  it("the cap tops it: a giant capped at 2 draws rosettes without pelt and says why; the cap comes from the complexity table", () => {
    expect([0, 1, 3, 5, 9].map(figureCap)).toEqual([0, 0, 2, 4, 4].map((i) => DETAIL_LOD.capByComplexity[i]));
    const capped = jaguar(420, 2);
    expect(capped.pieces[0].lod?.detail).toBe(2);
    expect(rosettes(capped.shapes).length).toBeGreaterThan(0);
    expect(capped.shapes.length * 2).toBeLessThan(jaguar(420).shapes.length);
    const lod = figureLod(420, 2, capped.pieces);
    expect(lod.detail).toBe(2);
    expect(lodNote("criatura_01", lod)).toMatch(/criatura_01 detail 2: 420 px en banda 3 \(≥128 px\) pide detail 3, topado a 2 por la complexity/);
  });

  it("is deterministic: same seed and size, same shapes and the same choice", () => {
    expect(jaguar(300, 3, 11).shapes).toEqual(jaguar(300, 3, 11).shapes);
    expect(figureLod(300, 3, jaguar(300, 3, 11).pieces)).toEqual(figureLod(300, 3, jaguar(300, 3, 11).pieces));
  });

  it("each piece of a CreatureProgram takes the detail of its own size", () => {
    const base = fromSixSlot({ cuerpo: "jaguar", cabeza: "mascara", ojos: "ojo" });
    const d = drawCompiled(compileProgram(base, MORPH_POLICY), 400, 600, 300, { detail: 3, lodPx: DETAIL_LOD.bandsPx, fill: "#fff", ink: "#000", accent: ACCENT }, mulberry32(3));
    const chosen = d.pieces.flatMap((p) => (p.lod ? [p.lod] : []));
    expect(chosen.length).toBeGreaterThan(1);
    for (const c of chosen) expect(c.detail).toBe(detailAt(c.px, DETAIL_LOD.bandsPx, 3).detail);
    expect(new Set(chosen.map((c) => c.detail)).size).toBeGreaterThan(1);
  });

  it("mitad jaguar mitad sirena habitada: the facade takes the trunk and the rosettes outside the panel stay drawn", () => {
    const d = jaguar(420, 3, 7, JAGUAR_SIRENA);
    const lived = habitar(d.pieces, "criatura_01", true, { ink, seed: 7 }, mulberry32(7));
    const panel = trunkPart(renamePart(d.pieces[0].part, "criatura_01.x"))!.mask!;
    const outside = rosettes(lived.shapes).filter((c) => !pointInPolygon([c.cx, c.cy], panel));
    expect(outside.length).toBeGreaterThan(3);
    expect(lived.records.some((r) => r.rule === "T2_BODY_AS_FACADE")).toBe(true);
  });
});
