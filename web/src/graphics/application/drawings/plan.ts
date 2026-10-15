import type { Building } from "../../domain/architecture/mass.ts";
import { planeY } from "../../domain/math/clip.ts";
import { DEFAULT_DRAWING_STYLE, type DrawingStyle } from "../../config/drawings.ts";
import { DEFAULT_VIEWPORT, planProjector, type Viewport } from "../projector.ts";
import { cutPolygons, facesOf, facesTowardCamera, keptFaces, openingFeatures, paintCuts, paintFaces, paper } from "./faces.ts";
import type { Drawing } from "./types.ts";

/** Horizontal section at `layout.cutHeight` seen from above; cut material in poché, what lies below in paper. */
export function drawPlan(building: Building, vp: Viewport = DEFAULT_VIEWPORT, style: DrawingStyle = DEFAULT_DRAWING_STYLE): Drawing {
  const projector = planProjector(building.bounds, vp);
  const plane = planeY(building.plan.layout.cutHeight);
  const below = facesTowardCamera(keptFaces(facesOf(building), plane, "negative"), projector);
  const cuts = cutPolygons(building, plane);
  return {
    kind: "plan",
    title: `Planta (corte a ${building.plan.layout.cutHeight} m)`,
    projector,
    list: [paper(projector, style), ...paintFaces(below, projector, style), ...paintCuts(cuts, projector, style)],
    features: openingFeatures(building, projector),
  };
}
