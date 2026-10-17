import type { Palette } from "../../config/palettes.ts";
import type { Scene } from "../../config/scene.ts";
import { MOTIFS } from "../../domain/motifs/figures/index.ts";
import type { MotifParams } from "../../domain/motifs/figures/types.ts";
import type { MiniComposer } from "../../domain/rewrite/portal.ts";
import type { Ink, RewriteRecord } from "../../domain/rewrite/rewrite.ts";
import { tagRoot, type SemanticRoot } from "../../domain/semantic.ts";
import type { Stage } from "../compose.ts";
import { columnas, type Columns } from "./columnas.ts";
import { occluders, paintOrder, type SceneItem } from "./escena.ts";
import { friso } from "./friso.ts";
import { REASON_BODIES } from "./habitar.ts";
import { decorSurface, ornamento, type FriezeOf } from "./ornamento.ts";
import { poblado } from "./poblado.ts";
import { siteOfBuilding } from "./lugares.ts";
import { solidItems } from "./solidos.ts";
import { visibleFaces, type Surface } from "./surfaces.ts";
import type { PatioContext } from "./types.ts";
import { volumenes } from "./volumenes.ts";

export type Inhabitants = { scene: Scene; pal: Palette; detail: MotifParams["detail"]; seed: number };

export type World = { volumenes: Stage; ornamento: Stage; habitada?: Stage };

const CLOISTER: SemanticRoot = { root: "claustro", kind: "building" };

const REASON_ANOMALY ="La anomalía columna-figura pide que la columna sea un cuerpo";

export function motifsOf(scene: Scene): string[] {
  return [...new Set(scene.groups.flatMap((g) => Object.values(g.creature.parts) as string[]))];
}

export function habitada(items: SceneItem[], forward: PatioContext["projector"]["forward"], records: RewriteRecord[], base: Stage["provenance"], deferred: number): Stage {
  const shapes = paintOrder(items, forward).flatMap((i) => i.shapes);
  const t = (rule: string) => records.filter((r) => r.rule === rule).length;
  return {
    name: "habitada",
    shapes,
    provenance: {
      algorithm: `${base!.algorithm}; figuras y sólidos que las tapan en el MISMO grafo de precedencia (planos de eje entre cajas en metros, sólo pares que se traslapan en pantalla) y orden de Kahn: una torre delante de una figura se pinta después de ella`,
      params: { ...base!.params, solidos_delante: deferred, T2_fachadas: t("T2_BODY_AS_FACADE"), T3_portales: t("T3_OPENING_AS_PORTAL"), T4_frisos: t("T4_INHABITED_FRIEZE") },
      decision: `${base!.decision}. Las etapas «volúmenes» y «figuras» se funden aquí para lo que está delante de una figura: la oclusión lo exige`,
      rewrites: records,
    },
  };
}

/** Architecture and inhabitants in one scene: T1 on piers, T4 on tall walls, T2/T3 on creatures, and a joint paint order where solids hide figures behind them. */
export function mundo(ctx: PatioContext, surfaces: Surface[], people: Inhabitants | undefined, mini: MiniComposer): World {
  const scene = people && people.scene.groups.length ? people.scene : undefined;
  const ink: Ink = { fill: ctx.pal.bg, ink: ctx.pal.ink, accent: ctx.pal.primary, deep: ctx.pal.deep, line: ctx.style.edgeWidth, detail: ctx.config.detail };
  const seed = people?.seed ?? ctx.config.seed;
  const faces = visibleFaces(ctx);
  const head = MOTIFS[scene?.groups.map((g) => g.creature.parts.cabeza).find(Boolean) ?? "mascara"];
  const empty: Columns = { bySolid: new Map(), records: [] };
  const columns = scene || ctx.config.anomaly === "columna-figura" ? columnas(ctx, faces, ink, head, seed, scene ? REASON_BODIES : REASON_ANOMALY) : empty;
  const kept = surfaces.filter((s) => !columns.bySolid.has(s.face.solid.id));
  const motifs = scene ? motifsOf(scene).map((m) => MOTIFS[m]).filter(Boolean) : [];
  const frieze: FriezeOf | undefined = scene ? (s) => friso(ctx, s, ink, motifs, seed, REASON_BODIES) : undefined;
  const solids = solidItems(ctx, faces, columns);
  for (const s of solids) tagRoot(s.shapes, CLOISTER);
  const placed = scene ? poblado(siteOfBuilding(ctx.building, ctx.projector), scene, people!.pal, people!.detail, seed, mini) : undefined;
  const forward = ctx.projector.forward;
  const front = placed ? occluders(solids, placed.items, forward) : new Set<string>();
  const back = paintOrder(solids.filter((s) => !front.has(s.id)), forward);
  const world: World = { volumenes: volumenes(ctx, back, columns.records, front.size), ornamento: ornamento(ctx, kept.filter((s) => !front.has(s.face.solid.id)), frieze) };
  if (!placed) return world;
  const records = [...placed.records];
  const ahead = solids.filter((s) => front.has(s.id)).map((s) => {
    const decor = kept.filter((k) => k.face.solid.id === s.id).map((k) => decorSurface(ctx, k, frieze));
    records.push(...decor.flatMap((d) => d.records));
    return { ...s, shapes: [...s.shapes, ...decor.flatMap((d) => d.shapes)] };
  });
  return { ...world, habitada: habitada([...ahead, ...placed.items], forward, records, placed.provenance, front.size) };
}
