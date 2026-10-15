import type { Colonnade } from "../../domain/architecture/types.ts";
import type { Shape } from "../../domain/shapes.ts";
import type { Painter } from "../painter.ts";
import { paintColumn } from "./column.ts";
import { paintDome } from "./dome.ts";
import { paintEntablature } from "./entablature.ts";
import { paintOpening } from "./opening.ts";
import { paintArchRing, paintSpandrelWall } from "./wall.ts";

export function paintColonnade(p: Painter, col: Colonnade): Shape[] {
  return [
    ...paintSpandrelWall(p, col),
    ...paintDome(p, col),
    ...col.arches.flatMap((a) => paintOpening(p, a, col.floorY)),
    ...col.arches.flatMap((a) => paintArchRing(p, a)),
    ...col.columns.flatMap((c) => paintColumn(p, c, col.floorY)),
    ...paintEntablature(p, col),
  ];
}
