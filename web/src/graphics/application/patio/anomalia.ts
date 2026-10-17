import type { Stage } from "../compose.ts";
import { edificioAnidado, type NestedComposer } from "./anomalias/anidado.ts";
import { columnaFigura } from "./anomalias/columna.ts";
import { escaleraImposible } from "./anomalias/escalera.ts";
import { torreFlotante } from "./anomalias/flotante.ts";
import type { Surface } from "./surfaces.ts";
import type { PatioContext, StageResult } from "./types.ts";

const NONE: Stage = {
  name: "anomalía",
  shapes: [],
  provenance: { algorithm: "ninguna", params: { anomaly: "none" }, decision: "composición coherente sin transformación surrealista" },
};

export function anomalia(ctx: PatioContext, surfaces: Surface[], compose: NestedComposer): StageResult {
  switch (ctx.config.anomaly) {
    case "none": return { stage: NONE, anchors: [] };
    case "escalera-imposible": return { stage: escaleraImposible(ctx), anchors: [] };
    case "edificio-anidado": return { stage: edificioAnidado(ctx, surfaces, compose), anchors: [] };
    case "torre-flotante": return { stage: torreFlotante(ctx), anchors: [] };
    case "columna-figura": return columnaFigura(ctx, surfaces);
  }
}
