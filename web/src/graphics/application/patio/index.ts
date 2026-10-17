import { PALETTES } from "../../config/palettes.ts";
import { patioStyle, resolvePatio, type PatioConfig } from "../../config/patio.ts";
import { makeLod } from "../../domain/lod.ts";
import { mulberry32, type Rng } from "../../../shared/rng.ts";
import { anomalia } from "./anomalia.ts";
import { buildPatioBuilding, patioProjector } from "./building.ts";
import { planta } from "./planta.ts";
import { simbolos } from "./simbolos.ts";
import { mundo, type Inhabitants } from "./mundo.ts";
import { surfacesOf } from "./surfaces.ts";
import type { MiniScene } from "../../domain/rewrite/portal.ts";
import type { PatioComposition, PatioContext } from "./types.ts";

export type { Anchor, AnchorKind, AnchorNormal, PatioComposition, PatioContext } from "./types.ts";
export type { PatioConfig } from "../../config/patio.ts";
export type { Inhabitants } from "./mundo.ts";

const MINI_PX = 560;

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

function miniPatio(config: PatioConfig, seed: number): MiniScene {
  const inner = composePatio({ ...config, seed, anomaly: "none", detail: 1, width: MINI_PX, height: MINI_PX, azimuth: config.azimuth }, mulberry32((seed + 1) * 7919));
  return { shapes: inner.stages.slice(0, 3).flatMap((s) => s.shapes), width: MINI_PX, height: MINI_PX };
}

/** One axonometric composition in traceable stages: planta, volúmenes, ornamento, símbolos, anomalía, and «habitada» when the scene brings inhabitants. */
export function composePatio(input: Partial<PatioConfig> = {}, rng?: Rng, people?: Inhabitants): PatioComposition {
  const ctx = patioContext(input, rng);
  const surfaces = surfacesOf(ctx);
  const marks = simbolos(ctx, surfaces);
  const twist = anomalia(ctx, surfaces, (cfg) => composePatio(cfg, mulberry32((cfg.seed + 1) * 7919)));
  const world = mundo(ctx, surfaces, people, (seed) => miniPatio(ctx.config, seed));
  return {
    stages: [planta(ctx), world.volumenes, world.ornamento, marks.stage, twist.stage, ...(world.habitada ? [world.habitada] : [])],
    anchors: [...marks.anchors, ...twist.anchors],
    width: ctx.config.width,
    height: ctx.config.height,
    building: ctx.building,
    projector: ctx.projector,
  };
}
