import type { Stage } from "../compose.ts";
import type { RewriteRecord } from "../../domain/rewrite/rewrite.ts";
import type { SceneItem } from "./escena.ts";
import type { PatioContext } from "./types.ts";

/** The ground slab belongs to the `planta` stage, so here only what rises above y = 0 is painted, in precedence-graph order. */
export function volumenes(ctx: PatioContext, ordered: SceneItem[], t1: RewriteRecord[], deferred: number): Stage {
  return {
    name: "volúmenes",
    shapes: ordered.flatMap((i) => i.shapes),
    provenance: {
      algorithm: "grafo de precedencia entre sólidos (plano de eje que separa sus cajas, sólo si se traslapan en pantalla) y orden de Kahn del más lejano al más cercano (isométrica)",
      params: { solidos: ordered.length, torres: ctx.config.towers, azimut: Number(ctx.config.azimuth.toFixed(3)), pilares_figura: t1.length, solidos_delante_de_figuras: deferred },
      decision:
        "silueta del conjunto: galerías bajas, salas medias, vestíbulo alto, torres con pirámide; las losas quedan lisas" +
        (t1.length ? `; T1: ${t1.length} pilares de la arcada SON figuras (pies en la base, manos y cabeza bajo el capitel)` : "") +
        (deferred ? `; ${deferred} sólidos que tapan figuras se pintan en la etapa «habitada», después de ellas` : ""),
      ...(t1.length ? { rewrites: t1 } : {}),
    },
  };
}
