import type { Frame2, Part, StructuralRole } from "../../domain/motifs/figures/parts.ts";
import type { Vec2 } from "../../domain/shapes.ts";
import type { Projector } from "../projector.ts";
import { toWorld, type LocalFrame } from "./frame.ts";

export type FaceRect = { x0: number; y0: number; x1: number; y1: number };

/** A rectangle of a face's local frame (metres, y down from the top edge) as a Part in screen space; under an affine projector its frame is exact. */
export function partOnFace(frame: LocalFrame, projector: Projector, r: FaceRect, id: string, role: StructuralRole, geometryId: string, anchors: Record<string, Vec2> = {}): Part {
  const at = (x: number, y: number): Vec2 => projector.toScreen(toWorld(frame, x, y));
  const o = at(r.x0, r.y0);
  const ux = at(r.x1, r.y0);
  const vy = at(r.x0, r.y1);
  const f: Frame2 = { o, u: [ux[0] - o[0], ux[1] - o[1]], v: [vy[0] - o[0], vy[1] - o[1]], w: r.x1 - r.x0, h: r.y1 - r.y0 };
  const mask = [o, ux, at(r.x1, r.y1), vy];
  return { id, role, geometryId, anchors, mask, frame: f, children: [] };
}
