import type { Crowd } from "./multitud.ts";

const m = (x: number) => `${x.toFixed(1)} m`;

function perchNote(crowd: Crowd): string {
  if (crowd.perched === undefined) return "";
  const down = crowd.spots.length - crowd.perched;
  return down > 0 ? ` · ${crowd.perched} en remates de torre (a lo más uno por remate), ${down} al suelo caminable` : ` · ${crowd.perched} en remates de torre, uno por remate`;
}

function regroupNote(crowd: Crowd): string {
  const r = crowd.regrouped;
  return r ? ` · el acomodo «${r.from}» no cabe en ningún suelo ancho (plaza, cruce, patio): se vuelve «${r.to}» a lo largo de la ruta encadenada` : "";
}

/** What the ground did to a crowd, for the provenance: where it walks, and how many or how tall it gave up so no body enters a solid. */
export function crowdNote(crowd: Crowd, asked: number): string {
  const where = crowd.ground.length ? ` sobre ${crowd.ground.join(", ")}` : "";
  const fewer = crowd.spots.length < asked ? `${crowd.spots.length} de ${asked}` : "";
  const smaller = crowd.heightM < crowd.wantedM - 1e-6 ? `escala ${m(crowd.wantedM)} → ${m(crowd.heightM)}` : "";
  const cuts = [fewer, smaller].filter(Boolean);
  const said = where + perchNote(crowd) + regroupNote(crowd);
  return cuts.length ? `${said} (el sitio no alcanza: ${cuts.join(", ")}; ningún cuerpo dentro de un sólido)` : said;
}
