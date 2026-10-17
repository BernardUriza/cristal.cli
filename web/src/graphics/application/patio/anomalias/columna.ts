import { polygon, stroked, line } from "../../../domain/shapes.ts";
import type { Stage } from "../../compose.ts";
import { toWorld } from "../frame.ts";
import type { Surface } from "../surfaces.ts";
import type { Anchor, PatioContext, StageResult } from "../types.ts";

export function columnaFigura(ctx: PatioContext, surfaces: Surface[]): StageResult {
  const piers = surfaces.filter((s) => s.role === "pilar" && s.frame.width >= 0.5 && s.frame.width <= 2.5 && s.px.h >= 12);
  const anchors: Anchor[] = [];
  const stage: Stage = {
    name: "anomalía",
    shapes: [],
    provenance: {
      algorithm: "columna-figura: cada pilar de la arcada visible se marca como ancla para que el integrador sustituya el pilar por una figura (mano, sirena) que carga el dintel",
      params: { pilares: piers.length },
      decision: "la columna se convierte en figura: el elemento estructural conserva su sitio y su carga, cambia su cuerpo",
    },
  };
  for (const s of piers) {
    const { width: w, height: h } = s.frame;
    const at = (x: number, y: number) => ctx.projector.toScreen(toWorld(s.frame, x, y));
    anchors.push({ id: `columna-figura:${s.face.solid.id}`, kind: "columna-figura", screen: at(w / 2, h / 2), sizePx: s.px.h, normal: Math.abs(s.face.normal[2]) >= Math.abs(s.face.normal[0]) ? "frente" : "lado" });
    stage.shapes.push(polygon([at(0, 0), at(w, 0), at(w, h), at(0, h)], stroked(ctx.pal.accent, 1.8)));
    stage.shapes.push(line(at(w / 2, 0.1), at(w / 2, h - 0.1), stroked(ctx.pal.accent, 0.9)));
  }
  return { stage, anchors };
}
