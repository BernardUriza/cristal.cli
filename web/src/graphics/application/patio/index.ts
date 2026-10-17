import { PALETTES } from "../../config/palettes.ts";
import { patioStyle, resolvePatio, type PatioConfig } from "../../config/patio.ts";
import { makeLod } from "../../domain/lod.ts";
import { mulberry32, type Rng } from "../../../shared/rng.ts";
import { anomalia } from "./anomalia.ts";
import { buildPatioBuilding, patioProjector } from "./building.ts";
import { ornamento } from "./ornamento.ts";
import { planta } from "./planta.ts";
import { simbolos } from "./simbolos.ts";
import { surfacesOf } from "./surfaces.ts";
import type { PatioComposition, PatioContext } from "./types.ts";
import { volumenes } from "./volumenes.ts";

export type { Anchor, AnchorKind, AnchorNormal, PatioComposition, PatioContext } from "./types.ts";
export type { PatioConfig } from "../../config/patio.ts";

export function patioContext(input: Partial<PatioConfig>, rng?: Rng): PatioContext {
  const config = resolvePatio(input);
  const building = buildPatioBuilding(config);
  return {
    config,
    building,
    projector: patioProjector(building, config),
    pal: PALETTES[config.palette],
    style: patioStyle(config.palette),
    lod: makeLod({ detailScale: 1 }),
    rng: rng ?? mulberry32(config.seed),
  };
}

/** One axonometric composition in five traceable stages: planta, volúmenes, ornamento, símbolos, anomalía. */
export function composePatio(input: Partial<PatioConfig> = {}, rng?: Rng): PatioComposition {
  const ctx = patioContext(input, rng);
  const surfaces = surfacesOf(ctx);
  const marks = simbolos(ctx, surfaces);
  const twist = anomalia(ctx, surfaces, (cfg) => composePatio(cfg, mulberry32((cfg.seed + 1) * 7919)));
  return {
    stages: [planta(ctx), volumenes(ctx), ornamento(ctx, surfaces), marks.stage, twist.stage],
    anchors: [...marks.anchors, ...twist.anchors],
    width: ctx.config.width,
    height: ctx.config.height,
    building: ctx.building,
    projector: ctx.projector,
  };
}
