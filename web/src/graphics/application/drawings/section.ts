import type { Building } from "../../domain/architecture/mass.ts";
import { planeX, planeZ, type Side } from "../../domain/math/clip.ts";
import { DEFAULT_DRAWING_STYLE, type DrawingStyle } from "../../config/drawings.ts";
import { backProjector, DEFAULT_VIEWPORT, frontProjector, leftProjector, rightProjector, type Viewport } from "../projector.ts";
import { cutPolygons, facesOf, facesTowardCamera, keptFaces, openingFeatures, paintCuts, paintFaces, paper } from "./faces.ts";
import type { Drawing } from "./types.ts";

export type SectionSpec = { axis: "x" | "z"; at: number; keep: Side };

/** Vertical cut; the observer stands on the discarded side looking at the kept half. */
export function drawSection(building: Building, spec: SectionSpec = { axis: "x", at: 0, keep: "negative" }, vp: Viewport = DEFAULT_VIEWPORT, style: DrawingStyle = DEFAULT_DRAWING_STYLE): Drawing {
  const plane = spec.axis === "x" ? planeX(spec.at) : planeZ(spec.at);
  const projectorFor = spec.axis === "x" ? (spec.keep === "negative" ? rightProjector : leftProjector) : spec.keep === "negative" ? frontProjector : backProjector;
  const projector = projectorFor(building.bounds, vp);
  const kept = facesTowardCamera(keptFaces(facesOf(building), plane, spec.keep), projector);
  const cuts = cutPolygons(building, plane);
  return {
    kind: "section",
    title: `Sección ${spec.axis.toUpperCase()} = ${spec.at} m`,
    projector,
    list: [paper(projector, style), ...paintFaces(kept, projector, style), ...paintCuts(cuts, projector, style)],
    features: openingFeatures(building, projector),
  };
}
