import type { Crowd } from "./multitud.ts";

const m = (x: number) => `${x.toFixed(1)} m`;

/** What the ground did to a crowd, for the provenance: where it walks, and how many or how tall it gave up so no body enters a solid. */
export function crowdNote(crowd: Crowd, asked: number): string {
  const where = crowd.ground.length ? ` sobre ${crowd.ground.join(", ")}` : "";
  const fewer = crowd.spots.length < asked ? `${crowd.spots.length} de ${asked}` : "";
  const smaller = crowd.heightM < crowd.wantedM - 1e-6 ? `escala ${m(crowd.wantedM)} → ${m(crowd.heightM)}` : "";
  const cuts = [fewer, smaller].filter(Boolean);
  return cuts.length ? `${where} (el sitio no alcanza: ${cuts.join(", ")}; ningún cuerpo dentro de un sólido)` : where;
}
