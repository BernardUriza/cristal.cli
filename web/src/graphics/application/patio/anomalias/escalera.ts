import { box, type Solid } from "../../../domain/architecture/mass.ts";
import { openingSpan } from "../../../domain/architecture/plan.ts";
import { pick } from "../../../../shared/rng.ts";
import type { Stage } from "../../compose.ts";
import { facesTowardCamera, paintFaces } from "../../drawings/faces.ts";
import type { PatioContext } from "../types.ts";

const RISER = 0.25;
const TREAD = 0.6;
const WIDTH = 1.2;

function pierCentres(ctx: PatioContext): number[] {
  const { plan } = ctx.building;
  const wall = plan.walls.find((w) => (w.left === "gal-n" && w.right === "patio") || (w.left === "patio" && w.right === "gal-n"))!;
  const spans = wall.openings.filter((o) => o.kind === "arch").map((o) => openingSpan(wall, o)).sort((a, b) => a.from - b.from);
  const centres: number[] = [];
  for (let i = 1; i < spans.length; i++) centres.push((spans[i - 1].end[0] + spans[i].start[0]) / 2);
  return centres;
}

export function escaleraImposible(ctx: PatioContext): Stage {
  const patio = ctx.building.plan.spaces.find((s) => s.kind === "courtyard")!;
  const candidates = pierCentres(ctx).filter((x) => x < 0);
  const px = candidates.length ? pick(ctx.rng, candidates) : patio.rect.x0 + 2;
  const first = Math.round(3.0 / RISER);
  const second = Math.round(1.5 / RISER);
  const solids: Solid[] = [];
  for (let k = 0; k < first; k++) {
    const z0 = patio.rect.z0 + (first - 1 - k) * TREAD;
    solids.push(box(`escalera:a${k}`, { kind: "wall" }, { x0: px - WIDTH / 2, x1: px + WIDTH / 2, z0, z1: z0 + TREAD }, 0, (k + 1) * RISER));
  }
  const landingY = first * RISER;
  solids.push(box("escalera:descanso", { kind: "lintel" }, { x0: px - WIDTH / 2, x1: px + WIDTH / 2, z0: patio.rect.z0 - 1.2, z1: patio.rect.z0 }, landingY - 0.3, landingY));
  for (let k = 0; k < second; k++) {
    const x1 = px - WIDTH / 2 - k * TREAD;
    solids.push(box(`escalera:b${k}`, { kind: "wall" }, { x0: x1 - TREAD, x1, z0: patio.rect.z0 - 1.2, z1: patio.rect.z0 }, landingY - 0.3, landingY + (k + 1) * RISER));
  }
  const faces = facesTowardCamera(solids.flatMap((s) => s.faces.map((f) => ({ ...f, solid: s }))), ctx.projector);
  return {
    name: "anomalía",
    shapes: paintFaces(faces, ctx.projector, ctx.style),
    provenance: {
      algorithm: "escalera imposible: cajas `box` proyectadas con el mismo painter's; primer tramo sube por el patio hasta un pilar ciego de la arcada norte, descanso que atraviesa el muro, segundo tramo sigue por la cara del muro hasta sobrepasar la cubierta de la galería",
      params: { pilar_x: Number(px.toFixed(2)), peldaños: first + second, huella_m: TREAD, contrahuella_m: RISER, llega_a_m: Number((landingY + second * RISER).toFixed(2)), galeria_m: ctx.building.plan.layout.heights.gallery },
      decision: "desemboca donde no hay hueco y a una altura incompatible con la planta: el surrealismo como transformación de una arquitectura coherente, no como ruido",
    },
  };
}
