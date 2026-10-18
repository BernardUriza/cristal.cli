import type { PatioConfig } from "../../../config/patio.ts";
import type { Stage } from "../../compose.ts";
import { polygon, stroked } from "../../../domain/shapes.ts";
import { mapShapes, subFrame, toWorld } from "../frame.ts";
import type { Surface } from "../surfaces.ts";
import type { PatioComposition, PatioContext } from "../types.ts";

export type NestedComposer = (config: PatioConfig) => PatioComposition;

const INSET = 0.5;
const NESTED_PX = { width: 560, height: 560 };

export function edificioAnidado(ctx: PatioContext, surfaces: Surface[], compose: NestedComposer): Stage {
  const faces = surfaces.filter((s) => s.role === "torre").sort((a, b) => b.px.w * b.px.h - a.px.w * a.px.h);
  const empty: Stage = { name: "anomalía", shapes: [], provenance: { algorithm: "edificio anidado", params: {}, decision: "ninguna cara de torre mira a cámara: no hay dónde anidar" } };
  if (faces.length === 0) return empty;
  const host = faces[0];
  const inner = compose({ ...ctx.config, anomaly: "none", rewrites: [], detail: 1, width: NESTED_PX.width, height: NESTED_PX.height });
  const { width: w, height: h } = host.frame;
  const frame = subFrame(host.frame, INSET, INSET + 0.8, w - 2 * INSET, h - 2 * INSET - 0.8, inner.width, inner.height);
  const scale = Math.hypot(...frame.u);
  const corners = [[0, 0], [inner.width, 0], [inner.width, inner.height], [0, inner.height]].map(([x, y]) => ctx.projector.toScreen(toWorld(frame, x, y)));
  const shapes = [...mapShapes(inner.stages.flatMap((s) => s.shapes), frame, ctx.projector), polygon(corners, stroked(ctx.pal.accent, 1.4))];
  return {
    name: "anomalía",
    shapes,
    provenance: {
      algorithm: "edificio anidado: `composePatio` recursivo (anomaly none, detail 1) y su DisplayList 2D mapeada al marco local de la cara de torre más grande hacia cámara",
      params: { cara: host.face.solid.id, metros_por_px: Number(scale.toFixed(4)), escala_planta: Number(((inner.width * scale) / (ctx.building.plan.bounds.x1 - ctx.building.plan.bounds.x0 + 10)).toFixed(3)), trazos: shapes.length },
      decision: "una ventana contiene otra fachada: el mismo patio entero vive dentro de una de sus torres; la recursión para en un nivel",
    },
  };
}
