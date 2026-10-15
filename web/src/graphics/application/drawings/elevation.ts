import type { Building } from "../../domain/architecture/mass.ts";
import { DEFAULT_DRAWING_STYLE, type DrawingStyle } from "../../config/drawings.ts";
import { backProjector, DEFAULT_VIEWPORT, frontProjector, leftProjector, rightProjector, type Viewport } from "../projector.ts";
import { facesOf, facesTowardCamera, openingFeatures, paintFaces, paper } from "./faces.ts";
import type { Drawing } from "./types.ts";

export type ElevationSide = "front" | "back" | "left" | "right";

const PROJECTORS = { front: frontProjector, back: backProjector, left: leftProjector, right: rightProjector } as const;
const TITLES = { front: "Alzado principal (sur)", back: "Alzado posterior (norte)", left: "Alzado oeste", right: "Alzado este" } as const;

export function drawElevation(building: Building, side: ElevationSide = "front", vp: Viewport = DEFAULT_VIEWPORT, style: DrawingStyle = DEFAULT_DRAWING_STYLE): Drawing {
  const projector = PROJECTORS[side](building.bounds, vp);
  const faces = facesTowardCamera(facesOf(building), projector);
  return {
    kind: "elevation",
    title: TITLES[side],
    projector,
    list: [paper(projector, style), ...paintFaces(faces, projector, style)],
    features: openingFeatures(building, projector),
  };
}
