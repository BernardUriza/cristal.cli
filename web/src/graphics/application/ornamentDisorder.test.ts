import { describe, expect, it } from "vitest";
import { direct, planOf } from "../../atelier/director.ts";
import { composeWork } from "../../atelier/work.ts";
import { grecaBand } from "../domain/motifs/bands.ts";
import { inks } from "../domain/motifs/ornament.ts";
import { CHARACTER } from "../domain/motifs/figures/character.ts";
import { disorderFor, disorderFraction } from "./ornamentDisorder.ts";
import { composePatio } from "./patio/index.ts";

const ornamentOf = (anomalyRate: number, seed = 7) => composePatio({ seed, anomalyRate }).stages.find((s) => s.name === "ornamento")!;
const site = (seed: number, surface = "muro@0.00,0.00,1.00", anomalyRate = 0.4) => ({ seed, anomalyRate, surface, band: "banda", cells: 200 });
const o = { ink: inks("#000", "#111", "#222", "#333"), sw: 1, level: 3, shows: () => true };
const cutAt = (seed: number, surface?: string, rate?: number) => grecaBand(0, 0, 400, 10, 200, o, disorderFor(site(seed, surface, rate))).params.grecaInterruptedAt;

describe("Molnár's 1 % in the game's bands", () => {
  it("the neutral anomaly keeps CHARACTER's fraction, order silences it, chaos multiplies it", () => {
    expect(disorderFraction(0.4)).toBeCloseTo(CHARACTER.disorder.fraction);
    expect(disorderFraction(0)).toBe(0);
    expect(disorderFraction(0.95)).toBeGreaterThan(4 * CHARACTER.disorder.fraction);
    expect(disorderFor(site(3, "x", 0))).toBeUndefined();
  });

  it("the same seed and surface interrupt the same cells; another seed or surface interrupts others", () => {
    expect(cutAt(5)).not.toBe("none");
    expect(cutAt(5)).toBe(cutAt(5));
    expect(cutAt(6)).not.toBe(cutAt(5));
    expect(cutAt(5, "torre@1.00,0.00,0.00")).not.toBe(cutAt(5));
  });

  it("order draws every band byte for byte as the undisturbed motif", () => {
    const plain = grecaBand(0, 0, 400, 10, 200, o);
    expect(grecaBand(0, 0, 400, 10, 200, o, disorderFor(site(5, "x", 0)))).toEqual(plain);
  });

  it("a patio interrupts a few cells, the same work twice is the same, and the indices reach the ornament stage's provenance", () => {
    const a = ornamentOf(0.4);
    expect(JSON.stringify(ornamentOf(0.4))).toBe(JSON.stringify(a));
    expect(Number(a.provenance!.params.celdas_interrumpidas)).toBeGreaterThan(0);
    expect(String(a.provenance!.params.interrupciones)).toMatch(/\[\d+:(rotate|omit|shift)/);
    expect(String(ornamentOf(0.4, 8).provenance!.params.interrupciones)).not.toBe(String(a.provenance!.params.interrupciones));
  });

  it("order leaves no cell interrupted and chaos interrupts more", () => {
    expect(ornamentOf(0).provenance!.params.celdas_interrumpidas).toBe(0);
    expect(Number(ornamentOf(0.95).provenance!.params.celdas_interrumpidas)).toBeGreaterThan(Number(ornamentOf(0.4).provenance!.params.celdas_interrumpidas));
  });

  it("the director's «orden» sets the rate to zero and «rómpelo» raises it; the program's ornament says what it cut", () => {
    expect(planOf(direct("un claustro único en perfecto orden", 4)).anomalyRate).toBe(0);
    expect(planOf(direct("un claustro único roto y absurdo", 4)).anomalyRate).toBeGreaterThan(0.4);
    const work = composeWork(direct("una ciudad de calles y avenidas que se cruzan en esquinas", 3), 1200, 900);
    const stage = work.stages.find((s) => s.name === "ornamento")!;
    expect(stage.provenance!.params).toHaveProperty("celdas_interrumpidas");
    expect(stage.provenance!.decision).toContain("simetría interrumpida");
  });
});
