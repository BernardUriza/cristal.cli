import { describe, expect, it } from "vitest";
import { REWRITES } from "../graphics/config/rewrites.ts";
import { verifiedChains } from "../graphics/domain/rewrite/chains.ts";
import type { RewriteRecord } from "../graphics/domain/rewrite/rewrite.ts";
import { direct, override, planOf, type Recipe } from "./director.ts";
import { parseDirection } from "./directorApi.ts";
import { composeWork } from "./work.ts";

const ARCH = new Set(["T5_BUILDING_AS_ORNAMENT", "T6_ARCHITECTURE_AS_ARCHITECTURE", "T7_ORNAMENT_AS_SPACE"]);
const minPx = (id: string) => REWRITES[id as keyof typeof REWRITES].constraints.minProjectedPx;
const rewritesOf = (n: string) => planOf(direct(n)).rewrites;

function arch(recipe: Recipe): { records: RewriteRecord[]; stages: string[] } {
  const work = composeWork(recipe, 1200, 900);
  return { records: work.stages.flatMap((s) => s.provenance?.rewrites ?? []).filter((r) => ARCH.has(r.rule)), stages: work.stages.map((s) => s.name) };
}

const chains = (records: RewriteRecord[]) => verifiedChains(records, { minVisibleRatio: 0.9, minProjectedPx: minPx });

describe("architectural recursion in works without figures", () => {
  it("the local director turns the declared words into rules", () => {
    expect(rewritesOf("una ciudad dentro de la ciudad")).toEqual(["T5"]);
    expect(rewritesOf("un palacio con templos en los capiteles")).toEqual(["T6"]);
    expect(rewritesOf("frisos que son ventanas")).toEqual(["T7"]);
    expect(rewritesOf("un claustro infinito")).toEqual(["T5", "T6", "T7"]);
    expect(rewritesOf("un palacio recursivo")).toEqual(["T5", "T6", "T7"]);
    expect(rewritesOf("un palacio de salones")).toEqual([]);
  });

  it("Pedro may ask for them; unknown rules are dropped", () => {
    const d = parseDirection({ title: "t", choices: [{ field: "rewrites", value: ["T6", "T9", "T7", "T6"], because: "templos" }] });
    expect(d?.choices[0].decision).toEqual({ field: "rewrites", value: ["T6", "T7"] });
  });

  it.each([
    ["una ciudad de torres infinita", 1],
    ["un palacio recursivo de salones", 2],
    ["un claustro único infinito con frisos que son ventanas", 3],
  ])("«%s» reaches verified three-level chains of two families or more, every level visible", (n, seed) => {
    const recipe = direct(n, seed);
    expect(planOf(recipe).scene?.groups ?? []).toHaveLength(0);
    const { records, stages } = arch(recipe);
    expect(stages).not.toContain("habitada");
    const found = chains(records);
    expect(found.length).toBeGreaterThan(0);
    for (const c of found) {
      expect(c.map((r) => r.depth)).toEqual([1, 2, 3]);
      expect(c.every((r) => r.evidence.semanticChanged && r.evidence.visibleRatio >= 0.9 && r.projectedPx >= minPx(r.rule))).toBe(true);
      expect(c[1].parent).toBe(c[0].id);
      expect(c[2].parent).toBe(c[1].id);
    }
  });

  it("without the words nothing is rewritten; density and anomaly rate govern how much is", () => {
    expect(arch(direct("una ciudad de torres", 1)).records).toEqual([]);
    const base = direct("una ciudad de torres infinita", 1);
    const calm = override(override(base, { field: "density", value: 0 }, "vacío"), { field: "anomalyRate", value: 0 }, "orden");
    const wild = override(override(base, { field: "density", value: 1 }, "lleno"), { field: "anomalyRate", value: 1 }, "caos");
    const few = arch(calm).records.filter((r) => r.depth === 1).length;
    expect(few).toBeGreaterThan(0);
    expect(arch(wild).records.filter((r) => r.depth === 1).length).toBeGreaterThan(few);
  });

  it("is deterministic per recipe", () => {
    const recipe = direct("un palacio recursivo de salones", 2);
    expect(arch(recipe)).toEqual(arch(recipe));
  });
});
