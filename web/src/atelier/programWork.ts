import { PALETTES } from "../graphics/config/palettes.ts";
import { composeInhabitedProgram } from "../graphics/application/program/habitado.ts";
import { expandProgram } from "../graphics/domain/grammar/expand.ts";
import { GrammarError, type ArchitectureProgram } from "../graphics/domain/grammar/types.ts";
import type { Plan, Recipe } from "./director.ts";
import { detailFor, sceneFor } from "./patioWork.ts";
import { readProgram } from "./programReader.ts";
import type { Composer } from "./work.ts";

const AZIMUTHS = [0.62, 0.48, 0.74, 0.55, 0.68];

export type ResolvedProgram = { program: ArchitectureProgram; fallback: string | null };

/** The plan's program under the recipe's seed; if the grammar rejects it, the local director's reading of the narration, said out loud. */
export function programFor(plan: Plan, recipe: Recipe): ResolvedProgram {
  const local = { ...readProgram(recipe.narration, recipe.seed).program, seed: recipe.seed };
  if (!plan.program) return { program: local, fallback: "el plan no traía programa: lo leí de la narración" };
  const program = { ...plan.program, seed: recipe.seed };
  try {
    expandProgram(program);
    return { program, fallback: null };
  } catch (err) {
    if (!(err instanceof GrammarError)) throw err;
    return { program: local, fallback: `la gramática rechazó el programa (${err.message}); dibujé la lectura local de la narración` };
  }
}

export const composeProgramWork: Composer = (recipe, plan, width, height) => {
  const { program, fallback } = programFor(plan, recipe);
  const scene = sceneFor(plan);
  const view = { width, height, palette: plan.palette, azimuth: AZIMUTHS[recipe.seed % AZIMUTHS.length] };
  const look = { seed: recipe.seed, density: plan.density, detail: detailFor(plan.complexity), ornament: plan.ornament };
  const people = { scene, pal: PALETTES[plan.palette], detail: detailFor(plan.complexity), seed: recipe.seed };
  const { stages } = composeInhabitedProgram(program, view, look, people);
  if (!fallback) return stages;
  const [first, ...rest] = stages;
  return [{ ...first, provenance: { ...first.provenance!, decision: `${first.provenance!.decision}; ${fallback}` } }, ...rest];
};
