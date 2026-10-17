import { PALETTES } from "../graphics/config/palettes.ts";
import { SCENE_LIMITS, type Scene } from "../graphics/config/scene.ts";
import { composePatio } from "../graphics/application/patio/index.ts";
import { poblado } from "../graphics/application/patio/poblado.ts";
import type { MotifParams } from "../graphics/domain/motifs/figures/index.ts";
import type { Plan, Recipe } from "./director.ts";
import { readScene } from "./sceneReader.ts";
import type { Composer } from "./work.ts";

const AZIMUTHS = [0.55, 0.38, 0.72, 0.46, 0.64];


export function sceneFor(plan: Plan): Scene {
  const raw = plan.scene ?? readScene("", plan.motifs).scene;
  const isWallOnly = (g: Scene["groups"][number]) => Object.keys(g.creature.parts).length === 1 && g.creature.name === g.creature.parts.cuerpo;
  const base = { ...raw, groups: raw.groups.filter((g) => !isWallOnly(g) || plan.motifs.includes(g.creature.name as never)) };
  const missing = plan.motifs.filter((m) => !base.groups.some((g) => Object.values(g.creature.parts).includes(m)));
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
    towers: plan.symmetry === "asymmetric" ? 2 : 4,
    architecture: scene.architecture,
    azimuth: AZIMUTHS[recipe.seed % AZIMUTHS.length],
    width,
    height,
  });
  return [...patio.stages, poblado(patio, scene, PALETTES[plan.palette], detailFor(plan.complexity), recipe.seed)];
};
