import type { Building } from "../../domain/architecture/mass.ts";
import { DEFAULT_DRAWING_STYLE, type DrawingStyle } from "../../config/drawings.ts";
import { DEFAULT_VIEWPORT, dimetricProjector, isometricProjector, militaryProjector, obliqueProjector, type Projector, type Viewport } from "../projector.ts";
import { facesOf, facesTowardCamera, openingFeatures, paintFaces, paper } from "./faces.ts";
import type { Drawing } from "./types.ts";

export type AxonometricKind = "isometric" | "dimetric" | "cavalier" | "cabinet" | "military";

const TITLES: Record<AxonometricKind, string> = {
  isometric: "Axonometría isométrica (35.26° / 45°)",
  dimetric: "Axonometría dimétrica (1 : 1 : ½)",
  cavalier: "Caballera (45°, profundidad 1)",
  cabinet: "Gabinete (45°, profundidad ½)",
  military: "Militar (planta en forma verdadera)",
};

function projectorFor(kind: AxonometricKind, building: Building, vp: Viewport): Projector {
  switch (kind) {
    case "isometric": return isometricProjector(building.bounds, vp);
    case "dimetric": return dimetricProjector(building.bounds, vp);
    case "cavalier": return obliqueProjector("cavalier", building.bounds, vp);
    case "cabinet": return obliqueProjector("cabinet", building.bounds, vp);
    case "military": return militaryProjector(building.bounds, vp);
  }
}

export function drawAxonometric(building: Building, kind: AxonometricKind = "isometric", vp: Viewport = DEFAULT_VIEWPORT, style: DrawingStyle = DEFAULT_DRAWING_STYLE): Drawing {
  const projector = projectorFor(kind, building, vp);
  const faces = facesTowardCamera(facesOf(building), projector);
  return {
    kind: "axonometric",
    title: TITLES[kind],
    projector,
    list: [paper(projector, style), ...paintFaces(faces, projector, style)],
    features: openingFeatures(building, projector),
  };
}
