import type { Shape } from "../../domain/shapes.ts";
import { facesTowardCamera, paintFaces } from "../drawings/faces.ts";
import { courtyardTiles } from "../patio/planta.ts";
import type { PatioContext } from "../patio/types.ts";
import type { ProgramScene } from "./scene.ts";
import { tagged } from "./volumeStage.ts";

const PROGRAM_TILE = 2;

/** Every slab from the lowest up; a courtyard gets the patio's checkered tiles, at a two-metre module, on its own top, so a nested precinct covers them. */
export function groundShapes(s: ProgramScene, ctx: PatioContext): { shapes: Shape[]; tiled: number } {
  const shapes: Shape[] = [];
  let tiled = 0;
  for (const v of [...s.volumes].sort((a, b) => a.space.y0 - b.space.y0)) {
    const slabs = v.solids.filter((x) => x.tag.kind === "floor");
    if (slabs.length === 0) continue;
    shapes.push(...paintFaces(facesTowardCamera(tagged(slabs), s.projector), s.projector, s.style));
    if (v.space.node.kind !== "courtyard") continue;
    shapes.push(...courtyardTiles(ctx, v.space, v.space.y1, PROGRAM_TILE));
    tiled++;
  }
  return { shapes, tiled };
}
