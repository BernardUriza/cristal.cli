import type { Scene } from "../../config/scene.ts";
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
import { creatureHeightM, spotsFor, type Site, type Spot } from "./lugares.ts";

export type Placed = { items: SceneItem[]; records: RewriteRecord[]; provenance: Provenance };

const THICK = 0.2;

export function poblado(c: Site, scene: Scene, pal: Palette, detail: MotifParams["detail"], seed: number, mini?: MiniComposer): Placed {
  const spots: Spot[] = scene.groups.flatMap((g, gi) => spotsFor(g, c).map((at) => ({ at, group: gi })));
  const rng = mulberry32(seed ^ 0x9e3779b1);
  const params = { detail, fill: pal.bg, ink: pal.ink, accent: pal.primary };
  const ink = { ...params, deep: pal.deep, line: 1 };
  const facadeParity = indexBelow(rng, 2);
  const items: SceneItem[] = [];
  const records: RewriteRecord[] = [];
  const heights = spots.map((spot) => creatureHeightM(scene.groups[spot.group], c));
  const biggest = heights.indexOf(Math.max(...heights));
  const bodies: GroupCreature[] = scene.groups.map(creatureOf);
  spots.forEach((spot, i) => {
    const hM = heights[i];
    const foot = c.projector.toScreen(spot.at);
    const head = c.projector.toScreen([spot.at[0], spot.at[1] + hM, spot.at[2]]);
    const heightPx = Math.max(8, Math.hypot(head[0] - foot[0], head[1] - foot[1]));
    const drawn = drawCompiled(bodies[spot.group].compiled, foot[0], foot[1], heightPx, params, rng);
    const id = `criatura_${String(i + 1).padStart(2, "0")}`;
    const lived = habitar(drawn.pieces, id, i % 2 === facadeParity || i === biggest, { ink, seed, mini }, rng);
    records.push(...lived.records);
    const box = { min: [spot.at[0] - THICK, spot.at[1], spot.at[2] - THICK] as const, max: [spot.at[0] + THICK, spot.at[1] + hM, spot.at[2] + THICK] as const };
    const screen = { minX: foot[0] - heightPx * 0.62, maxX: foot[0] + heightPx * 0.62, minY: foot[1] - heightPx * 1.02, maxY: foot[1] + 2 };
    items.push({ id, kind: "figure", box, screen, depth: c.projector.toNdc(spot.at)[2], shapes: tagRoot(lived.shapes, { root: id, kind: "creature" }) });
  });
  const summary = scene.groups.map((g, gi) => `${g.count} ${g.creature.name} (${bodies[gi].label}) en ${g.arrangement} · ${g.place}`);
  return {
    items,
    records,
    provenance: {
      algorithm: "escena del director: criaturas compuestas con partes de la pared, colocadas en METROS sobre la arquitectura (patio, azoteas, torres, cielo, escalera) y proyectadas con el mismo proyector isométrico",
      params: { grupos: scene.groups.length, figuras: spots.length, arquitectura: `${scene.architecture.footprint}/${scene.architecture.courtyard}/${scene.architecture.heights}` },
      decision: summary.join("; ") || "sin figuras en la escena",
    },
  };
}
