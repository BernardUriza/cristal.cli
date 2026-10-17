import { prism, type Solid } from "../../../domain/architecture/mass.ts";
import type { Vec3 } from "../../../domain/math/vec3.ts";
import { polygon, filled, type Vec2 } from "../../../domain/shapes.ts";
import { pick } from "../../../../shared/rng.ts";
import type { Stage } from "../../compose.ts";
import { facesTowardCamera, paintFaces } from "../../drawings/faces.ts";
import { FLOAT_RATIO, floatingTowerBase, pyramidOver, towers } from "../building.ts";
import { frameOf, mapShapes, projectedSize } from "../frame.ts";
import { ornamentFor } from "../ornamento.ts";
import type { Surface } from "../surfaces.ts";
import type { PatioContext } from "../types.ts";

const TURN = Math.PI / 4;

function rotatedFootprint(w: number, d: number, cx: number, cz: number): Vec2[] {
  const c = Math.cos(TURN);
  const s = Math.sin(TURN);
  const corners: Vec2[] = [[-w / 2, -d / 2], [-w / 2, d / 2], [w / 2, d / 2], [w / 2, -d / 2]];
  return corners.map(([x, z]): Vec2 => [cx + x * c - z * s, cz + x * s + z * c]);
}

export function torreFlotante(ctx: PatioContext): Stage {
  const { plan } = ctx.building;
  const h = plan.layout.heights;
  const patio = plan.spaces.find((s) => s.kind === "courtyard")!;
  const cx = (patio.rect.x0 + patio.rect.x1) / 2;
  const cz = (patio.rect.z0 + patio.rect.z1) / 2;
  const model = pick(ctx.rng, towers(ctx.building));
  const w = model.rect.x1 - model.rect.x0;
  const d = model.rect.z1 - model.rect.z0;
  const foot = rotatedFootprint(w, d, cx, cz);
  const y0 = floatingTowerBase(ctx.building);
  const top = y0 + h.tower + h.roofSlab;
  const base3: Vec3[] = foot.map((p) => [p[0], top, p[1]]);
  const solids: Solid[] = [
    prism("flotante:cuerpo", { kind: "wall", space: model.id }, foot, y0, y0 + h.tower),
    prism("flotante:losa", { kind: "roof", space: model.id }, foot, y0 + h.tower, top),
    pyramidOver("flotante:cubierta", base3, [cx, top + h.towerRoof, cz]),
  ];
  const faces = facesTowardCamera(solids.flatMap((s) => s.faces.map((f) => ({ ...f, solid: s }))), ctx.projector);
  const shadow = polygon(foot.map((p) => ctx.projector.toScreen([p[0], 0.01, p[1]])), filled(ctx.pal.ink, ctx.pal.ink, 0.4, { opacity: 0.35 }));
  const dressed = faces.filter((f) => f.solid.id !== "flotante:losa" && f.normal[1] >= 0).map((f): Surface => {
    const frame = frameOf(f.points, f.normal, ctx.projector);
    return { face: f, role: f.solid.id === "flotante:cuerpo" ? "torre" : "cubierta-torre", frame, px: projectedSize(frame, ctx.projector), space: model.id };
  });
  const ornament = dressed.flatMap((s) => mapShapes(ornamentFor(s, ctx), s.frame, ctx.projector));
  return {
    name: "anomalía",
    shapes: [shadow, ...paintFaces(faces, ctx.projector, ctx.style), ...ornament],
    provenance: {
      algorithm: "torre flotante: la planta de una torre existente girada 45° en azimut, extruida con `prism` y pirámide sobre el centro del patio; sombra = su planta proyectada sobre y=0; recibe el mismo ornamento de torre (estrías, roseta, sierpinski)",
      params: { modelo: model.id, giro_grados: 45, base_m: Number(y0.toFixed(2)), altura_relativa: FLOAT_RATIO, planta_m: `${w}×${d}` },
      decision: "una pieza del conjunto se desprende y queda suspendida sobre el patio; conserva la gramática (misma planta, misma cubierta) para que lo imposible sea la posición, no la forma",
    },
  };
}
