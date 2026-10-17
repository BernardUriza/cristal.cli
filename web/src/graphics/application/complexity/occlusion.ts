import { polygonBounds } from "../../domain/bezier.ts";
import { boxCenter, boxCorners, type Box3, type Vec3 } from "../../domain/math/vec3.ts";
import type { Vec2 } from "../../domain/shapes.ts";
import { occluders, paintOrder, type SceneItem } from "../patio/escena.ts";
import type { Projector } from "../projector.ts";

export type OcclusionBody = { id: string; kind: SceneItem["kind"]; box: Box3 };

export type Painter = (items: SceneItem[], forward: Vec3) => SceneItem[];

export type OcclusionResult = { figures: number; violations: number; overlappingPairs: number };

/** The scene's own order: solids behind every figure first, then figures and their occluders in one precedence graph. */
export const scenePainter: Painter = (items, forward) => {
  const solids = items.filter((i) => i.kind === "solid");
  const figures = items.filter((i) => i.kind === "figure");
  const front = occluders(solids, figures, forward);
  return [...paintOrder(solids.filter((s) => !front.has(s.id)), forward), ...paintOrder([...solids.filter((s) => front.has(s.id)), ...figures], forward)];
};

function sceneItem(b: OcclusionBody, projector: Projector): SceneItem {
  const screen = polygonBounds(boxCorners(b.box).map((c): Vec2 => projector.toScreen(c)));
  return { id: b.id, kind: b.kind, box: b.box, screen, depth: projector.toNdc(boxCenter(b.box))[2], shapes: [] };
}

const FACES: [number, number, number][] = [[0, 1, 2], [0, 2, 1], [1, 2, 0]];

/** Nearest distance along the view ray per screen cell, sampling the box's six faces densely. */
function depthMap(box: Box3, projector: Projector, cell: number): Map<number, number> {
  const out = new Map<number, number>();
  const { eye, forward } = projector;
  const cols = Math.ceil(projector.viewport.width / cell);
  const steps = Math.max(8, Math.ceil((Math.max(...box.max.map((v, k) => v - box.min[k])) * projector.pxPerMeter) / (cell / 2)));
  for (const [u, v, w] of FACES) for (const side of [box.min[w], box.max[w]]) for (let i = 0; i <= steps; i++) for (let j = 0; j <= steps; j++) {
    const p: number[] = [0, 0, 0];
    p[u] = box.min[u] + ((box.max[u] - box.min[u]) * i) / steps;
    p[v] = box.min[v] + ((box.max[v] - box.min[v]) * j) / steps;
    p[w] = side;
    const [x, y] = projector.toScreen(p as unknown as Vec3);
    const key = Math.floor(y / cell) * cols + Math.floor(x / cell);
    const d = (p[0] - eye[0]) * forward[0] + (p[1] - eye[1]) * forward[1] + (p[2] - eye[2]) * forward[2];
    if (d < (out.get(key) ?? Infinity)) out.set(key, d);
  }
  return out;
}

/** A figure is incoherent when some body that overlaps it on screen is painted on the wrong side of it by the ray-cast truth. */
export function occlusionViolations(bodies: readonly OcclusionBody[], projector: Projector, painter: Painter = scenePainter, cell = 4): OcclusionResult {
  const items = bodies.map((b) => sceneItem(b, projector));
  const rank = new Map(painter(items, projector.forward).map((i, k) => [i.id, k]));
  const depth = new Map(bodies.map((b) => [b.id, depthMap(b.box, projector, cell)]));
  const figures = bodies.filter((b) => b.kind === "figure");
  let violations = 0, overlappingPairs = 0;
  for (const f of figures) {
    const fd = depth.get(f.id)!;
    let wrong = false;
    for (const o of bodies) {
      if (o.id === f.id) continue;
      let nearer = 0, farther = 0;
      for (const [key, dOther] of depth.get(o.id)!) {
        const dFigure = fd.get(key);
        if (dFigure === undefined) continue;
        if (dOther < dFigure) nearer++; else farther++;
      }
      if (nearer + farther === 0) continue;
      overlappingPairs++;
      const paintedAfter = rank.get(o.id)! > rank.get(f.id)!;
      if (paintedAfter !== nearer > farther) wrong = true;
    }
    if (wrong) violations++;
  }
  return { figures: figures.length, violations, overlappingPairs };
}
