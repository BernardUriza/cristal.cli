import { describe, expect, it } from "vitest";
import { mulberry32 } from "../../../shared/rng.ts";
import { MORPH_POLICY } from "../../config/morph.ts";
import { REWRITE_TUNING } from "../../config/rewrites.ts";
import { polygonBounds } from "../../domain/bezier.ts";
import { compileProgram, fromSixSlot } from "../../domain/motifs/figures/body/program/compile.ts";
import type { CreatureOp, CreatureProgram } from "../../domain/motifs/figures/body/program/types.ts";
import { drawCompiled } from "../../domain/motifs/figures/creature.ts";
import { renamePart } from "../../domain/motifs/figures/parts.ts";
import { trunkOf } from "../../domain/motifs/figures/trunk.ts";
import { rewriteTree } from "../../domain/rewrite/rewrite.ts";
import { creatureRules, grammarRules, habitar, REASON_BODIES, REGION_NOTE, trunkPart } from "./habitar.ts";

const ink = { fill: "#fff", ink: "#000", accent: "#c00", deep: "#004", line: 1, detail: 3 as const };
const params = { detail: 3 as const, fill: "#fff", ink: "#000", accent: "#c00" };

function drawn(parts: Parameters<typeof fromSixSlot>[0], ops: CreatureOp[] = [], seed = 7) {
  const base = fromSixSlot(parts);
  const program: CreatureProgram = { ...base, seed, operations: [...base.operations, ...ops] };
  return drawCompiled(compileProgram(program, MORPH_POLICY), 400, 600, 320, params, mulberry32(seed));
}

const JAGUAR_SIRENA: CreatureOp[] = [
  { op: "blend", socket: "torso", motif: "sirena", region: "punta", weight: 1 },
  { op: "blend", socket: "torso", motif: "sirena", region: "extremidad", weight: 0.3 },
];

const live = (d: ReturnType<typeof drawn>, seed = 7) => habitar(d.pieces, "criatura_01", true, { ink, seed }, mulberry32(seed));

describe("habitar: T2 takes the trunk, the head keeps its face", () => {
  it("mitad jaguar mitad sirena: the facade falls inside the trunk, never in the head's box, and the motif's own strokes stay", () => {
    const d = drawn({ cuerpo: "jaguar" }, JAGUAR_SIRENA);
    expect(d.pieces).toHaveLength(1);
    const part = renamePart(d.pieces[0].part, "criatura_01.x");
    const t = trunkOf(part.mask!, part.regions!, REWRITE_TUNING.trunk)!;
    const head = polygonBounds(t.head);
    const facade = polygonBounds(trunkPart(part)!.mask!);
    expect(facade.minX >= head.maxX || facade.maxX <= head.minX || facade.minY >= head.maxY || facade.maxY <= head.minY).toBe(true);
    const r = live(d);
    const t2 = r.records.filter((x) => x.rule === "T2_BODY_AS_FACADE");
    expect(t2).toHaveLength(1);
    expect(t2[0].sourceNode.endsWith("#tronco")).toBe(true);
    expect(t2[0].region).toBe(REGION_NOTE.trunk);
    expect(r.shapes.slice(0, d.pieces[0].shapes.length)).toEqual(d.pieces[0].shapes);
  });

  it("a stair alone has no legible trunk and keeps the whole-figure facade it had", () => {
    const d = drawn({ cuerpo: "escalera" });
    const piece = d.pieces[0];
    expect(trunkPart(piece.part)).toBeUndefined();
    const before = rewriteTree(renamePart(piece.part, `criatura_01.${piece.part.id}`), creatureRules(true), { depth: 0, seed: 7, reason: REASON_BODIES, rng: mulberry32(7), ink });
    const r = live(d);
    expect(r.shapes).toEqual(before.rootReplaced ? before.shapes : [...piece.shapes, ...before.shapes]);
    expect(r.records.map(({ region: _r, ...x }) => x)).toEqual(before.records);
    expect(r.records.every((x) => x.region === REGION_NOTE.whole)).toBe(true);
  });

  it("an explicit architecturalize keeps what the operation asks on the named socket", () => {
    const d = drawn({ cuerpo: "jaguar" }, [{ op: "architecturalize", socket: "torso", grammar: "tower" }]);
    const piece = d.pieces[0];
    expect(piece.grammar).toBe("tower");
    const reason = `${REASON_BODIES}; el programa arquitecturiza ${piece.slot} como tower`;
    const before = rewriteTree(renamePart(piece.part, `criatura_01.${piece.part.id}`), grammarRules("tower"), { depth: 0, seed: 7, reason, rng: mulberry32(7), ink });
    const r = live(d);
    expect(before.rootReplaced).toBe(true);
    expect(r.shapes).toEqual(before.shapes);
    expect(r.records.map(({ region: _r, ...x }) => x)).toEqual(before.records);
    expect(r.records[0].region).toBe(`socket ${piece.slot} (tower)`);
  });

  it("in a body of several pieces only the torso socket becomes a facade", () => {
    const d = drawCompiled(compileProgram({ family: "biped", seed: 3, operations: [] }, MORPH_POLICY), 400, 600, 320, params, mulberry32(3));
    const r = habitar(d.pieces, "criatura_01", true, { ink, seed: 3 }, mulberry32(3));
    const t2 = r.records.filter((x) => x.rule === "T2_BODY_AS_FACADE");
    expect(t2.length).toBeGreaterThan(0);
    expect(t2.every((x) => x.sourceNode.indexOf("torso") >= 0)).toBe(true);
  });

  it("is deterministic for the same seed", () => {
    const a = live(drawn({ cuerpo: "jaguar" }, JAGUAR_SIRENA));
    const b = live(drawn({ cuerpo: "jaguar" }, JAGUAR_SIRENA));
    expect(a).toEqual(b);
  });
});
