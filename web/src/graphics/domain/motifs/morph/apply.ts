import type { MorphPolicy } from "../../../config/morph.ts";
import { MOTIF_IDS, MOTIFS } from "../figures/index.ts";
import { REGIONS } from "../figures/regions.ts";
import { blendByRegion, type Hybrid, type RegionWeights } from "./blend.ts";
import { caricature, familyOf, motifNorm, type Caricature } from "./caricature.ts";
import { motifContour, type RegionContour } from "./contour.ts";

export type MorphSpec = { with?: string; weights?: RegionWeights; k?: number };

export type MorphResult = { contour: RegionContour; label: string; hybrid?: Hybrid["provenance"]; caricature?: Caricature["provenance"] };

const norms = new Map<string, RegionContour>();

/** The mean shape of the motif's own family (animals, faces, objects); the eight together are a blob. */
export function familyNorm(motif: string, policy: MorphPolicy): RegionContour {
  const family = familyOf(motif, policy);
  const ids = family ? policy.families[family] : MOTIF_IDS;
  const key = `${family ?? "todos"}:${ids.join(",")}:${policy.pointsPerRegion}:${policy.normIterations}`;
  const hit = norms.get(key);
  if (hit) return hit;
  const norm = motifNorm(ids.map((id) => motifContour(MOTIFS[id], policy.pointsPerRegion)), policy.normIterations, `norma:${family ?? "todos"}`);
  norms.set(key, norm);
  return norm;
}

const fmt = (v: number): string => String(Number(v.toFixed(2)));

function hybridLabel(h: Hybrid["provenance"]): string {
  return h.regions.filter((r) => r.weight > 0).map((r) => `${r.region} ${fmt(r.weight)}`).join(", ") || "nada";
}

/** Base motif → optional region blend with a partner → optional caricature against the base's family norm. */
export function morphMotif(base: string, spec: MorphSpec, policy: MorphPolicy): MorphResult {
  let contour = motifContour(MOTIFS[base], policy.pointsPerRegion);
  let label = base;
  const out: Omit<MorphResult, "contour" | "label"> = {};
  if (spec.with && spec.weights) {
    const h = blendByRegion(contour, motifContour(MOTIFS[spec.with], policy.pointsPerRegion), spec.weights, policy);
    contour = h.contour;
    out.hybrid = h.provenance;
    label += `⊕${spec.with}[${hybridLabel(h.provenance)}]`;
  }
  if (spec.k !== undefined && spec.k !== 1) {
    const c = caricature(contour, familyNorm(base, policy), spec.k, policy);
    contour = c.contour;
    out.caricature = c.provenance;
    label += `~k${fmt(c.provenance.k)}`;
  }
  return { contour, label, ...out };
}

export function describeMorph(r: MorphResult): string {
  const notes: string[] = [];
  const h = r.hybrid, c = r.caricature;
  if (h) notes.push(h.safety && h.safety.relaxed ? `pesos ×${fmt(h.safety.factor)} para no autocruzarse (${h.safety.crossingsAtRequest} cruces al pedido)` : "sin autocruce");
  if (c) notes.push(c.safety.relaxed ? `k ${fmt(c.requestedK)}→${fmt(c.k)} para no autocruzarse (${c.safety.crossingsAtRequest} cruces al pedido) contra ${c.norm}` : `k ${fmt(c.k)} contra ${c.norm}, sin autocruce`);
  return notes.join("; ");
}

export const isRegion = (v: unknown): v is (typeof REGIONS)[number] => typeof v === "string" && (REGIONS as readonly string[]).indexOf(v) >= 0;
