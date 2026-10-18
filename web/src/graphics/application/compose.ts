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
import { cutsParams, type Cut } from "./ornamentDisorder.ts";
import { makeView } from "./projection.ts";
import type { RewriteRecord } from "../domain/rewrite/rewrite.ts";
import type { RegionEvidence, SiteEvidence } from "./complexity/types.ts";
import { tagRoot, type SemanticRoot } from "../domain/semantic.ts";

const TEMPLE: SemanticRoot = { root: "templo", kind: "building" };

export type Provenance = { algorithm: string; params: Record<string, number | string>; decision: string; rewrites?: RewriteRecord[]; site?: SiteEvidence; regions?: RegionEvidence[] };

export type Stage = { name: string; shapes: DisplayList; provenance?: Provenance };

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
  const traced = (name: string, paint: (q: Painter) => DisplayList): Stage => {
    const cuts: Cut[] = [];
    const shapes = paint({ ...p, cuts });
    if (cuts.length === 0) return { name, shapes };
    return { name, shapes, provenance: { algorithm: "gramática de fachada proyectada a un punto de fuga; greca y chevrón por celda con la simetría interrumpida de Molnár", params: { seed: cfg.art.seed, anomalyRate: cfg.art.anomalyRate, ...cutsParams(cuts) }, decision: `pintor «${name}» sobre la arquitectura en metros; unas pocas celdas giran, faltan o se desplazan, sembradas por obra y elemento` } };
  };
  const stages: Stage[] = [
    { name: "fondo", shapes: [rect(0, 0, width, height, solid(p.pal.bg))] },
    { name: "cielo", shapes: [...paintSun(p, architecture.sky, width, height), ...paintStars(p, architecture.sky, width, height, rng)] },
    { name: "horizonte", shapes: [rect(0, view.hy, width, 2, solid(p.pal.ink))] },
    traced("piso", (q) => paintFloor(q, architecture.floor)),
    traced("alas", (q) => tagRoot(architecture.wings.flatMap((w) => paintColonnade(q, w)), TEMPLE)),
    traced("plataforma", (q) => tagRoot(paintPlatform(q, architecture.platform), TEMPLE)),
    traced("templo", (q) => tagRoot(paintColonnade(q, architecture.main), TEMPLE)),
    traced("marco", (q) => paintFrame(q, width, height)),
  ];
  const layers: DisplayList = stages.flatMap((stage) => stage.shapes);
  return { cfg, architecture, stages, layers, width, height };
}
