import type { DrawingStyle } from "../../config/drawings.ts";
import type { Palette, PaletteName } from "../../config/palettes.ts";
import type { GraphLayout } from "../../domain/grammar/layout.ts";
import type { SpaceGraph } from "../../domain/grammar/types.ts";
import type { SpaceSolids } from "../../domain/grammar/volumes.ts";
import type { Solid } from "../../domain/architecture/mass.ts";
import type { Stage } from "../compose.ts";
import type { Projector } from "../projector.ts";

export type ProgramView = { width: number; height: number; palette: PaletteName; azimuth: number };

export type ProgramScene = {
  graph: SpaceGraph;
  layout: GraphLayout;
  volumes: SpaceSolids[];
  solids: Solid[];
  projector: Projector;
  pal: Palette;
  style: DrawingStyle;
  view: ProgramView;
};

export type ProgramComposition = { stages: Stage[]; scene: ProgramScene; width: number; height: number };
