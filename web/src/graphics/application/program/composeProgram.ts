import { PALETTES } from "../../config/palettes.ts";
import { patioStyle } from "../../config/patio.ts";
import { expandProgram } from "../../domain/grammar/expand.ts";
import { solveLayout, type GraphLayout } from "../../domain/grammar/layout.ts";
import type { ArchitectureProgram } from "../../domain/grammar/types.ts";
import { volumesOf } from "../../domain/grammar/volumes.ts";
import type { Solid } from "../../domain/architecture/mass.ts";
import type { Vec3 } from "../../domain/math/vec3.ts";
import { mulberry32 } from "../../../shared/rng.ts";
import { framedIsometric } from "../framing.ts";
import { ornamentStage } from "./ornamentStage.ts";
import { programStage } from "./planStage.ts";
import type { ProgramComposition, ProgramScene, ProgramView } from "./scene.ts";
import { volumeStage } from "./volumeStage.ts";

export type { ProgramComposition, ProgramScene, ProgramView } from "./scene.ts";

const LAYOUT_SALT = 0x9e3779b9;

function builtPoints(solids: readonly Solid[], layout: GraphLayout): Vec3[] {
  const plan = layout.spaces.flatMap((p): Vec3[] => [[p.rect.x0, p.y0, p.rect.z0], [p.rect.x1, p.y0, p.rect.z0], [p.rect.x0, p.y0, p.rect.z1], [p.rect.x1, p.y0, p.rect.z1]]);
  return [...solids.flatMap((s) => s.faces.flatMap((f) => f.points)), ...plan];
}

/** The scene framed on what is built plus whatever else stands or flies in it (`extra`, in metres). */
export function programScene(program: ArchitectureProgram, view: ProgramView, extra: readonly Vec3[] = []): ProgramScene {
  const graph = expandProgram(program);
  const layout = solveLayout(graph, mulberry32((program.seed ^ LAYOUT_SALT) >>> 0));
  const volumes = volumesOf(layout, graph.edges);
  const solids = volumes.flatMap((v) => v.solids);
  const projector = framedIsometric([...builtPoints(solids, layout), ...extra], view, view.azimuth);
  return { graph, layout, volumes, solids, projector, pal: PALETTES[view.palette], style: patioStyle(view.palette), view };
}

export function composeProgram(program: ArchitectureProgram, view: ProgramView): ProgramComposition {
  const scene = programScene(program, view);
  return { stages: [programStage(scene), volumeStage(scene), ornamentStage(scene)], scene, width: view.width, height: view.height };
}
