import { composeIllustration, type Stage } from "../graphics/application/compose.ts";
import { configFor, planOf, type Plan, type Recipe } from "./director.ts";
import { composePatioWork } from "./patioWork.ts";

export type Work = { stages: Stage[]; width: number; height: number; plan: Plan; seed: number };

export type Composer = (recipe: Recipe, plan: Plan, width: number, height: number) => Stage[];

const composeTemplo: Composer = (recipe, _plan, width, height) => {
  const ill = composeIllustration(configFor(recipe, width, height));
  return ill.stages.map((stage) => ({
    ...stage,
    provenance: stage.provenance ?? { algorithm: "gramática de fachada (columnas, arcos, cúpula, piso) proyectada a un punto de fuga", params: { seed: recipe.seed, complexity: _plan.complexity, density: _plan.density, anomalyRate: _plan.anomalyRate }, decision: `pintor «${stage.name}» sobre la arquitectura en metros` },
  }));
};

const composers: Record<Plan["composition"], Composer> = { templo: composeTemplo, patio: composePatioWork };

export function composeWork(recipe: Recipe, width: number, height: number): Work {
  const plan = planOf(recipe);
  return { stages: composers[plan.composition](recipe, plan, width, height), width, height, plan, seed: recipe.seed };
}
