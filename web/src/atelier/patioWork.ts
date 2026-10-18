import { figureCap } from "../graphics/config/detail.ts";
import { PALETTES } from "../graphics/config/palettes.ts";
import { SCENE_LIMITS, type Scene } from "../graphics/config/scene.ts";
import { composePatio } from "../graphics/application/patio/index.ts";
import type { MotifParams } from "../graphics/domain/motifs/figures/index.ts";
import type { Plan, Recipe } from "./director.ts";
import { usesMotif } from "./morphReader.ts";
import { readScene } from "./sceneReader.ts";
import { WALL_RULE } from "./sceneRules.ts";
import type { Composer } from "./work.ts";

const AZIMUTHS = [0.55, 0.38, 0.72, 0.46, 0.64];


export function sceneFor(plan: Plan): Scene {
  const raw = plan.scene ?? readScene("", plan.motifs).scene;
  const isWallOnly = (g: Scene["groups"][number]) => Object.keys(g.creature.parts).length === 1 && g.creature.name === g.creature.parts.cuerpo;
  const base = { ...raw, groups: raw.groups.filter((g) => !isWallOnly(g) || plan.motifs.includes(g.creature.name as never)) };
  const asked = !WALL_RULE.onlyWithoutFigures || !base.groups.length || plan.motifsBy === "humano";
  const missing = asked ? plan.motifs.filter((m) => !base.groups.some((g) => usesMotif(g, m))) : [];
  return missing.length ? { ...base, groups: [...base.groups, ...readScene("", missing).scene.groups].slice(0, SCENE_LIMITS.groups) } : base;
}

export function detailFor(complexity: number): MotifParams["detail"] {
  return complexity <= 2 ? 1 : complexity === 3 ? 2 : 3;
}

export const composePatioWork: Composer = (recipe: Recipe, plan: Plan, width: number, height: number) => {
  const scene = sceneFor(plan);
  const patio = composePatio({
    seed: recipe.seed,
    palette: plan.palette,
    density: plan.density,
    detail: detailFor(plan.complexity),
    ornament: plan.ornament,
    anomaly: plan.anomaly,
    anomalyRate: plan.anomalyRate,
    rewrites: plan.rewrites,
    towers: plan.symmetry === "asymmetric" ? 2 : 4,
    architecture: scene.architecture,
    azimuth: AZIMUTHS[recipe.seed % AZIMUTHS.length],
    width,
    height,
  }, undefined, { scene, pal: PALETTES[plan.palette], detail: figureCap(plan.complexity), seed: recipe.seed });
  return patio.stages;
};
