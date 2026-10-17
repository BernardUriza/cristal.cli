import type { Shape } from "../../domain/shapes.ts";
import { facesTowardCamera, paintFaces } from "../drawings/faces.ts";
import { courtyardTiles } from "../patio/planta.ts";
import type { PatioContext } from "../patio/types.ts";
import type { PlacedSpace } from "../../domain/grammar/layout.ts";
import type { SpaceKind } from "../../domain/grammar/types.ts";
import type { ProgramScene } from "./scene.ts";
import { tagged } from "./volumeStage.ts";

const PROGRAM_TILE = 2;

const PAVED: readonly SpaceKind[] = ["courtyard", "plaza", "ring-gallery", "platform"];

const ESPLANADE_OF: readonly SpaceKind[] = ["ring-gallery", "platform"];

const ESPLANADE_TILE = 1;

function tileOf(s: ProgramScene, space: PlacedSpace): number {
  if (PAVED.includes(space.node.kind)) return PROGRAM_TILE;
  const esplanade = space.node.kind === "complex" && s.layout.spaces.some((p) => p.node.parent === space.node.id && ESPLANADE_OF.includes(p.node.kind));
  return esplanade ? ESPLANADE_TILE : 0;
}

/** Every slab from the lowest up; a courtyard, plaza, ring walk, terrace or temple esplanade gets the patio's checkered tiles, at a two-metre module, on its own top, so a nested precinct covers them. */
export function groundShapes(s: ProgramScene, ctx: PatioContext): { shapes: Shape[]; tiled: number } {
  const shapes: Shape[] = [];
  let tiled = 0;
  for (const v of [...s.volumes].sort((a, b) => a.space.y0 - b.space.y0)) {
    const slabs = v.solids.filter((x) => x.tag.kind === "floor");
    if (slabs.length === 0) continue;
    shapes.push(...paintFaces(facesTowardCamera(tagged(slabs), s.projector), s.projector, s.style));
    const tile = tileOf(s, v.space);
    if (!tile) continue;
    shapes.push(...courtyardTiles(ctx, v.space, v.space.y1, tile));
    tiled++;
  }
  return { shapes, tiled };
}
