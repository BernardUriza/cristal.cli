import type { Scene } from "../../config/scene.ts";
import { FIGURE_EXTENT } from "../../config/framing.ts";
import { DETAIL_LOD } from "../../config/detail.ts";
import type { Vec3 } from "../../domain/math/vec3.ts";
import { figurePoints } from "../framing.ts";
import type { Palette } from "../../config/palettes.ts";
import { drawCompiled } from "../../domain/motifs/figures/creature.ts";
import { creatureOf, type GroupCreature } from "./programa.ts";
import type { MotifParams } from "../../domain/motifs/figures/types.ts";
import { indexBelow, mulberry32 } from "../../../shared/rng.ts";
import type { Provenance } from "../compose.ts";
import type { MiniComposer } from "../../domain/rewrite/portal.ts";
import type { RewriteRecord } from "../../domain/rewrite/rewrite.ts";
import { tagRoot } from "../../domain/semantic.ts";
import type { SceneItem } from "./escena.ts";
import { habitar } from "./habitar.ts";
import { figureLod, lodNote } from "./lodFigura.ts";
import { creatureHeightM, spotsFor, type Site, type Spot } from "./lugares.ts";
import { crowdNote } from "./nota.ts";
import { crowdOn } from "./multitud.ts";
import { isProtagonist } from "./protagonista.ts";

export type Placed = { items: SceneItem[]; records: RewriteRecord[]; provenance: Provenance };

const THICK = 0.2;

/** Every point the scene's figures occupy in metres, so the framing sees them before they are drawn. */
export function figureHull(c: Site, scene: Scene): Vec3[] {
  return scene.groups.flatMap((g) => spotsFor(g, c).flatMap((at) => figurePoints(at, creatureHeightM(g, c), c.projector.forward)));
}

export function poblado(c: Site, scene: Scene, pal: Palette, detail: MotifParams["detail"], seed: number, mini?: MiniComposer): Placed {
  const spots: Spot[] = scene.groups.flatMap((g, gi) => spotsFor(g, c).map((at) => ({ at, group: gi })));
  const rng = mulberry32(seed ^ 0x9e3779b1);
  const params = { detail, lodPx: DETAIL_LOD.bandsPx, fill: pal.bg, ink: pal.ink, accent: pal.primary };
  const ink = { ...params, deep: pal.deep, line: 1 };
  const facadeParity = indexBelow(rng, 2);
  const items: SceneItem[] = [];
  const records: RewriteRecord[] = [];
  const heights = spots.map((spot) => creatureHeightM(scene.groups[spot.group], c));
  const biggest = heights.indexOf(Math.max(...heights));
  const bodies: GroupCreature[] = scene.groups.map(creatureOf);
  const lods: string[] = [];
  const lodParams: Record<string, number> = {};
  spots.forEach((spot, i) => {
    const hM = heights[i];
    const foot = c.projector.toScreen(spot.at);
    const head = c.projector.toScreen([spot.at[0], spot.at[1] + hM, spot.at[2]]);
    const heightPx = Math.max(8, Math.hypot(head[0] - foot[0], head[1] - foot[1]));
    const drawn = drawCompiled(bodies[spot.group].compiled, foot[0], foot[1], heightPx, params, rng);
    const id = `criatura_${String(i + 1).padStart(2, "0")}`;
    const lod = figureLod(heightPx, detail, drawn.pieces);
    lodParams[`detail_${id}`] = lod.detail;
    lods.push(lodNote(id, lod));
    const lived = habitar(drawn.pieces, id, i % 2 === facadeParity || i === biggest, { ink, seed, mini }, rng);
    records.push(...lived.records);
    const box = { min: [spot.at[0] - THICK, spot.at[1], spot.at[2] - THICK] as const, max: [spot.at[0] + THICK, spot.at[1] + hM, spot.at[2] + THICK] as const };
    const half = heightPx * FIGURE_EXTENT.halfWidth;
    const screen = { minX: foot[0] - half, maxX: foot[0] + half, minY: foot[1] - heightPx * FIGURE_EXTENT.height, maxY: foot[1] + 2 };
    items.push({ id, kind: "figure", box, screen, depth: c.projector.toNdc(spot.at)[2], shapes: tagRoot(lived.shapes, { root: id, kind: "creature" }) });
  });
  const summary = scene.groups.map((g, gi) => `${g.count} ${g.creature.name} (${bodies[gi].label}) en ${g.arrangement} · ${g.place}${isProtagonist(g) ? "" : crowdNote(crowdOn(g, c), g.count)}`);
  return {
    items,
    records,
    provenance: {
      algorithm: "escena del director: criaturas compuestas con partes de la pared, colocadas en METROS sobre la arquitectura (el suelo caminable: calles, plaza, anillos, terrazas, patio; azoteas, torres, cielo, escalera) sin que ningún cuerpo entre en un sólido y proyectadas con el mismo proyector isométrico",
      params: { grupos: scene.groups.length, figuras: spots.length, arquitectura: `${scene.architecture.footprint}/${scene.architecture.courtyard}/${scene.architecture.heights}`, ...lodParams },
      decision: `${summary.join("; ") || "sin figuras en la escena"}${lods.length ? `. LOD por tamaño proyectado: ${lods.join("; ")}` : ""}`,
    },
  };
}
