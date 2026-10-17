import type { DrawingStyle } from "../../config/drawings.ts";
import type { Palette } from "../../config/palettes.ts";
import type { PatioConfig } from "../../config/patio.ts";
import type { Building } from "../../domain/architecture/mass.ts";
import type { Lod } from "../../domain/lod.ts";
import type { Vec2 } from "../../domain/shapes.ts";
import type { Rng } from "../../../shared/rng.ts";
import type { Stage } from "../compose.ts";
import type { Projector } from "../projector.ts";

export type AnchorKind = "patio-centro" | "torre-cima" | "muro-exterior" | "cornisa" | "ventana" | "columna-figura";

export type AnchorNormal = "frente" | "lado" | "arriba";

export type Anchor = { id: string; kind: AnchorKind; screen: Vec2; sizePx: number; normal?: AnchorNormal };

export type PatioContext = {
  config: PatioConfig;
  building: Building;
  projector: Projector;
  pal: Palette;
  style: DrawingStyle;
  lod: Lod;
  rng: Rng;
};

export type StageResult = { stage: Stage; anchors: Anchor[] };

export type PatioComposition = { stages: Stage[]; anchors: Anchor[]; width: number; height: number; building: Building };
