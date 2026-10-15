import { buildMass, type Building } from "../../domain/architecture/mass.ts";
import { buildPlan } from "../../domain/architecture/plan.ts";
import type { CloisterLayout } from "../../domain/architecture/layout.ts";
import type { Program } from "../../domain/architecture/program.ts";
import { validatePlan, type ValidationReport } from "../../domain/architecture/validate.ts";
import { DEFAULT_VIEWPORT, type Viewport } from "../projector.ts";
import { drawAxonometric } from "./axonometric.ts";
import { drawElevation } from "./elevation.ts";
import { drawPlan } from "./plan.ts";
import { drawSection, type SectionSpec } from "./section.ts";
import type { Drawing } from "./types.ts";

export type BuildingSheets = { building: Building; report: ValidationReport; sheets: Drawing[] };

/** Through the north door of sala-n1 (at = 0.5 → x = −4), both arcades and the courtyard; looking west. */
export const DEFAULT_SECTION: SectionSpec = { axis: "x", at: -4, keep: "negative" };

export function composeBuilding(program: Program, layout: CloisterLayout): { building: Building; report: ValidationReport } {
  const plan = buildPlan(program, layout);
  return { building: buildMass(plan), report: validatePlan(plan, program) };
}

export function standardSheets(building: Building, vp: Viewport = DEFAULT_VIEWPORT): Drawing[] {
  return [drawPlan(building, vp), drawElevation(building, "front", vp), drawSection(building, DEFAULT_SECTION, vp), drawAxonometric(building, "isometric", vp)];
}

export function composeSheets(program: Program, layout: CloisterLayout, vp: Viewport = DEFAULT_VIEWPORT): BuildingSheets {
  const { building, report } = composeBuilding(program, layout);
  return { building, report, sheets: standardSheets(building, vp) };
}

export { drawAxonometric, drawElevation, drawPlan, drawSection };
export type { Drawing };
