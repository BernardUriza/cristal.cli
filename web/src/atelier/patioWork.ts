import { PALETTES } from "../graphics/config/palettes.ts";
import { MOTIFS, type MotifParams } from "../graphics/domain/motifs/figures/index.ts";
import { composePatio, type Anchor } from "../graphics/application/patio/index.ts";
import type { Stage } from "../graphics/application/compose.ts";
import type { Shape } from "../graphics/domain/shapes.ts";
import { mulberry32 } from "../shared/rng";
import type { Plan, Recipe } from "./director.ts";
import type { MotifName } from "./vocabulary.ts";
import type { Composer } from "./work.ts";

const ANCHOR_ORDER: Anchor["kind"][] = ["patio-centro", "torre-cima", "muro-exterior", "cornisa", "ventana"];
const COLUMN_FIGURES: MotifName[] = ["mano", "sirena"];
const FIGURE_SCALE = 0.9;

export function detailFor(complexity: number): MotifParams["detail"] {
  return complexity <= 2 ? 1 : complexity === 3 ? 2 : 3;
}

function placeMotif(id: MotifName, anchor: Anchor, plan: Plan, seed: number) {
  const pal = PALETTES[plan.palette];
  const params: MotifParams = { size: anchor.sizePx * FIGURE_SCALE, detail: detailFor(plan.complexity), fill: pal.bg, ink: pal.ink, accent: pal.primary };
  return MOTIFS[id].draw(anchor.screen[0], anchor.screen[1], params, mulberry32(seed ^ anchor.id.length));
}

export function figuresStage(anchors: Anchor[], plan: Plan, seed: number): Stage {
  const placed: { motif: MotifName; anchor: string }[] = [];
  const shapes: Shape[] = [];
  const byKind = (kind: Anchor["kind"]) => anchors.filter((a) => a.kind === kind);
  const picked: Anchor[] = [];
  for (const kind of ANCHOR_ORDER) for (const a of byKind(kind)) if (picked.length < plan.motifs.length) picked.push(a);
  plan.motifs.forEach((motif, i) => {
    const anchor = picked[i];
    if (!anchor) return;
    shapes.push(...placeMotif(motif, anchor, plan, seed + i).shapes);
    placed.push({ motif, anchor: anchor.id });
  });
  if (plan.anomaly === "columna-figura") {
    byKind("columna-figura").forEach((anchor, i) => {
      const motif = COLUMN_FIGURES[i % COLUMN_FIGURES.length];
      shapes.push(...placeMotif(motif, anchor, plan, seed + 100 + i).shapes);
      placed.push({ motif, anchor: anchor.id });
    });
  }
  return {
    name: "figuras",
    shapes,
    provenance: {
      algorithm: "bezier_contours (siluetas propias) + ornamentador matemático, colocadas en anclas de la arquitectura",
      params: { figuras: placed.map((p) => `${p.motif}@${p.anchor}`).join(", ") || "ninguna", detalle: detailFor(plan.complexity) },
      decision: plan.motifs.length > 0 ? `pediste ${plan.motifs.join(", ")}: van al centro del patio, la cima de la torre y el muro mayor` : "no pediste figuras de la pared",
    },
  };
}

export const composePatioWork: Composer = (recipe: Recipe, plan: Plan, width: number, height: number) => {
  const patio = composePatio({
    seed: recipe.seed,
    palette: plan.palette,
    density: plan.density,
    detail: detailFor(plan.complexity),
    ornament: plan.ornament,
    anomaly: plan.anomaly,
    towers: plan.symmetry === "asymmetric" ? 2 : 4,
    width,
    height,
  });
  return [...patio.stages, figuresStage(patio.anchors, plan, recipe.seed)];
};
