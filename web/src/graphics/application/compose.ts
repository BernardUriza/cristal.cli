import { PALETTES } from "../config/palettes.ts";
import type { CompositionConfig, ConfigInput } from "../config/types.ts";
import { resolveConfig } from "../config/validate.ts";
import { buildArchitecture } from "../domain/architecture/build.ts";
import type { Architecture } from "../domain/architecture/types.ts";
import { makeLod } from "../domain/lod.ts";
import { mulberry32 } from "../../shared/rng";
import { rect, solid, type DisplayList } from "../domain/shapes.ts";
import { paintColonnade } from "./facade/colonnade.ts";
import { paintFloor, paintPlatform } from "./facade/floor.ts";
import { paintFrame } from "./facade/frame.ts";
import { paintStars, paintSun } from "./facade/sky.ts";
import type { Painter } from "./painter.ts";
import { makeView } from "./projection.ts";

export type Stage = { name: string; shapes: DisplayList };

export type Illustration = {
  cfg: CompositionConfig;
  architecture: Architecture;
  stages: Stage[];
  layers: DisplayList;
  width: number;
  height: number;
};

export function composeArchitecture(cfg: CompositionConfig): Architecture {
  return buildArchitecture(cfg.art, mulberry32(cfg.art.seed));
}

export function composeIllustration(input: ConfigInput = {}): Illustration {
  const cfg = resolveConfig(input);
  const { width, height } = cfg.tech;
  const rng = mulberry32(cfg.art.seed);
  const architecture = buildArchitecture(cfg.art, rng);
  const view = makeView(cfg.tech, architecture.main.z);
  const p: Painter = { view, pal: PALETTES[cfg.art.palette], art: cfg.art, lod: makeLod(cfg.tech.lod) };
  const stages: Stage[] = [
    { name: "fondo", shapes: [rect(0, 0, width, height, solid(p.pal.bg))] },
    { name: "cielo", shapes: [...paintSun(p, architecture.sky, width, height), ...paintStars(p, architecture.sky, width, height, rng)] },
    { name: "horizonte", shapes: [rect(0, view.hy, width, 2, solid(p.pal.ink))] },
    { name: "piso", shapes: paintFloor(p, architecture.floor) },
    { name: "alas", shapes: architecture.wings.flatMap((w) => paintColonnade(p, w)) },
    { name: "plataforma", shapes: paintPlatform(p, architecture.platform) },
    { name: "templo", shapes: paintColonnade(p, architecture.main) },
    { name: "marco", shapes: paintFrame(p, width, height) },
  ];
  const layers: DisplayList = stages.flatMap((stage) => stage.shapes);
  return { cfg, architecture, stages, layers, width, height };
}
