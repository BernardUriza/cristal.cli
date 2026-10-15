import { PALETTES } from "../config/palettes.ts";
import type { CompositionConfig, ConfigInput } from "../config/types.ts";
import { resolveConfig } from "../config/validate.ts";
import { buildArchitecture } from "../domain/architecture/build.ts";
import type { Architecture } from "../domain/architecture/types.ts";
import { makeLod } from "../domain/lod.ts";
import { mulberry32 } from "../domain/rng.ts";
import { rect, solid, type DisplayList } from "../domain/shapes.ts";
import { paintColonnade } from "./facade/colonnade.ts";
import { paintFloor, paintPlatform } from "./facade/floor.ts";
import { paintFrame } from "./facade/frame.ts";
import { paintStars, paintSun } from "./facade/sky.ts";
import type { Painter } from "./painter.ts";
import { makeView } from "./projection.ts";

export type Illustration = { cfg: CompositionConfig; architecture: Architecture; layers: DisplayList; width: number; height: number };

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
  const layers: DisplayList = [
    rect(0, 0, width, height, solid(p.pal.bg)),
    ...paintSun(p, architecture.sky, width, height),
    ...paintStars(p, architecture.sky, width, height, rng),
    rect(0, view.hy, width, 2, solid(p.pal.ink)),
    ...paintFloor(p, architecture.floor),
    ...architecture.wings.flatMap((w) => paintColonnade(p, w)),
    ...paintPlatform(p, architecture.platform),
    ...paintColonnade(p, architecture.main),
    ...paintFrame(p, width, height),
  ];
  return { cfg, architecture, layers, width, height };
}
