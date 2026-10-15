import type { DisplayList, Vec2 } from "../../domain/shapes.ts";
import type { Projector } from "../projector.ts";

export type DrawingKind = "plan" | "elevation" | "section" | "axonometric";

/** `features` maps every opening id to its projected world rectangle: the hook for cross-view invariants. */
export type Drawing = {
  kind: DrawingKind;
  title: string;
  projector: Projector;
  list: DisplayList;
  features: Record<string, Vec2[]>;
};
