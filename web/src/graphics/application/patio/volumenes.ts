import { paintFaces } from "../drawings/faces.ts";
import type { Stage } from "../compose.ts";
import { visibleFaces } from "./surfaces.ts";
import type { PatioContext } from "./types.ts";

/** The ground slab belongs to the `planta` stage, so here only what rises above y = 0 is painted. */
export function volumenes(ctx: PatioContext): Stage {
  const faces = visibleFaces(ctx).filter((f) => f.solid.tag.kind !== "floor");
  const shapes = paintFaces(faces, ctx.projector, ctx.style);
  return {
    name: "volúmenes",
    shapes,
    provenance: {
      algorithm: "painter's por sólido sobre caras hacia cámara (isométrica)",
      params: { caras: faces.length, torres: ctx.config.towers, azimut: Number(ctx.config.azimuth.toFixed(3)) },
      decision: "silueta del conjunto: galerías bajas, salas medias, vestíbulo alto, torres con pirámide; las losas quedan lisas",
    },
  };
}
