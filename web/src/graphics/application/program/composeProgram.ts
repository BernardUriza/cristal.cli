import { PALETTES } from "../../config/palettes.ts";
import { patioStyle } from "../../config/patio.ts";
import { expandProgram } from "../../domain/grammar/expand.ts";
import { solveLayout } from "../../domain/grammar/layout.ts";
import type { ArchitectureProgram } from "../../domain/grammar/types.ts";
import { volumesOf } from "../../domain/grammar/volumes.ts";
import { boundsOf, type Box3 } from "../../domain/math/vec3.ts";
import { mulberry32 } from "../../../shared/rng.ts";
import { isometricProjector } from "../projector.ts";
import { ornamentStage } from "./ornamentStage.ts";
import { programStage } from "./planStage.ts";
import type { ProgramComposition, ProgramScene, ProgramView } from "./scene.ts";
import { volumeStage } from "./volumeStage.ts";

export type { ProgramComposition, ProgramScene, ProgramView } from "./scene.ts";

const APRON = 3;

const LAYOUT_SALT = 0x9e3779b9;

function sheet(box: Box3): Box3 {
  return { min: [box.min[0] - APRON, box.min[1], box.min[2] - APRON], max: [box.max[0] + APRON, box.max[1], box.max[2] + APRON] };
}

export function programScene(program: ArchitectureProgram, view: ProgramView): ProgramScene {
  const graph = expandProgram(program);
  const layout = solveLayout(graph, mulberry32((program.seed ^ LAYOUT_SALT) >>> 0));
  const volumes = volumesOf(layout, graph.edges);
  const solids = volumes.flatMap((v) => v.solids);
  const frame = sheet(boundsOf(solids.flatMap((s) => s.faces.flatMap((f) => f.points))));
  const projector = isometricProjector(frame, { width: view.width, height: view.height, margin: 0.05 }, view.azimuth);
  return { graph, layout, volumes, solids, projector, pal: PALETTES[view.palette], style: patioStyle(view.palette), view };
}

export function composeProgram(program: ArchitectureProgram, view: ProgramView): ProgramComposition {
  const scene = programScene(program, view);
  return { stages: [programStage(scene), volumeStage(scene), ornamentStage(scene)], scene, width: view.width, height: view.height };
}
