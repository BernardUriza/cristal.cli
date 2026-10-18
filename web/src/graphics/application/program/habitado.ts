import type { PatioConfig } from "../../config/patio.ts";
import type { ArchitectureProgram } from "../../domain/grammar/types.ts";
import { MOTIFS } from "../../domain/motifs/figures/index.ts";
import type { Ink, RewriteRecord } from "../../domain/rewrite/rewrite.ts";
import { tagRoot } from "../../domain/semantic.ts";
import type { Stage } from "../compose.ts";
import type { TaggedFace } from "../drawings/faces.ts";
import type { Columns } from "../patio/columnas.ts";
import { occluders, paintOrder, type SceneItem } from "../patio/escena.ts";
import { frameOf, projectedSize } from "../patio/frame.ts";
import { friso, type Decor } from "../patio/friso.ts";
import { REASON_BODIES } from "../patio/habitar.ts";
import { miniPatio } from "../patio/index.ts";
import { habitada, motifsOf, type Inhabitants } from "../patio/mundo.ts";
import { archCounts, decorSurface, RECURSION_NOTE, SYMMETRY_NOTE, type FriezeOf } from "../patio/ornamento.ts";
import { recursion } from "../patio/recursion.ts";
import { cutsParams, type Cut } from "../ornamentDisorder.ts";
import { figureHull, poblado } from "../patio/poblado.ts";
import { solidItems } from "../patio/solidos.ts";
import { visibleFaces, type Surface } from "../patio/surfaces.ts";
import type { PatioContext } from "../patio/types.ts";
import { programScene } from "./composeProgram.ts";
import { programContext, roleOf } from "./ornamentStage.ts";
import { isFlatRoof, roofDecor } from "./azoteas.ts";
import { pilares } from "./pilares.ts";
import { programStage } from "./planStage.ts";
import type { ProgramScene, ProgramView } from "./scene.ts";
import { siteOfProgram } from "./site.ts";
import { groundShapes } from "./ground.ts";
import { volumeStage } from "./volumeStage.ts";

export type InhabitedProgram = { stages: Stage[]; scene: ProgramScene };

export type ProgramLook = Partial<Pick<PatioConfig, "seed" | "density" | "detail" | "ornament" | "anomalyRate" | "rewrites">>;

function surfacesOf(s: ProgramScene, faces: readonly TaggedFace[]): Surface[] {
  return faces.flatMap((face) => {
    const role = roleOf(face, s);
    if (!role) return [];
    const frame = frameOf(face.points, face.normal, s.projector);
    return [{ face, role, frame, px: projectedSize(frame, s.projector), space: face.solid.tag.space }];
  });
}

function decorated(items: SceneItem[], decor: Map<string, Decor[]>): SceneItem[] {
  return items.map((i) => ({ ...i, shapes: [...i.shapes, ...(decor.get(i.id) ?? []).flatMap((d) => d.shapes)] }));
}

function stage(base: Stage, name: string, shapes: Stage["shapes"], params: Record<string, number | string>, records: RewriteRecord[], note: string): Stage {
  const p = base.provenance!;
  return { name, shapes, provenance: { ...p, params: { ...p.params, ...params }, decision: `${p.decision}${note}`, ...(records.length ? { rewrites: records } : {}) } };
}

/** The grammar's program inhabited like the patio: T1 on gallery piers, T4 on tall walls, T2/T3 on creatures, ornament painted with its own solid, one occlusion graph for solids and figures. */
export function inhabitProgram(s: ProgramScene, ctx: PatioContext, people?: Inhabitants): Stage[] {
  const scene = people && people.scene.groups.length ? people.scene : undefined;
  const seed = people?.seed ?? ctx.config.seed;
  const ink: Ink = { fill: ctx.pal.bg, ink: ctx.pal.ink, accent: ctx.pal.primary, deep: ctx.pal.deep, line: ctx.style.edgeWidth, detail: ctx.config.detail };
  const faces = visibleFaces(ctx);
  const head = MOTIFS[scene?.groups.map((g) => g.creature.parts.cabeza).find(Boolean) ?? "mascara"];
  const columns: Columns = scene ? pilares(s, ctx, faces, ink, head, seed, REASON_BODIES) : { bySolid: new Map(), records: [] };
  const motifs = scene ? motifsOf(scene).map((m) => MOTIFS[m]).filter(Boolean) : [];
  const frieze: FriezeOf | undefined = scene ? (x) => friso(ctx, x, ink, motifs, seed, REASON_BODIES) : undefined;
  const decor = new Map<string, Decor[]>();
  const add = (id: string, d: Decor) => decor.set(id, [...(decor.get(id) ?? []), d]);
  const cuts: Cut[] = [];
  const surfaces = surfacesOf(s, faces).filter((x) => !columns.bySolid.has(x.face.solid.id));
  const rec = recursion(ctx, surfaces, ink, seed);
  for (const x of surfaces) add(x.face.solid.id, decorSurface(ctx, x, frieze, cuts, rec));
  for (const f of faces.filter((f) => isFlatRoof(f, s))) add(f.solid.id, { shapes: roofDecor(f, ctx), records: [] });
  const solids = solidItems(ctx, faces, columns);
  const spaceOf = new Map(faces.map((f) => [f.solid.id, f.solid.tag.space ?? f.solid.id]));
  for (const x of solids) tagRoot(x.shapes, { root: spaceOf.get(x.id) ?? x.id, kind: "building" });
  const placed = scene ? poblado(siteOfProgram(s), scene, people!.pal, people!.detail, seed, (k) => miniPatio(ctx.config, k)) : undefined;
  const forward = s.projector.forward;
  const front = placed ? occluders(solids, placed.items, forward) : new Set<string>();
  const back = paintOrder(solids.filter((x) => !front.has(x.id)), forward);
  const t4 = (ids: SceneItem[]) => ids.flatMap((i) => (decor.get(i.id) ?? []).flatMap((d) => d.records));
  const ground = groundShapes(s, ctx);
  const vol = volumeStage(s);
  const stages = [
    programStage(s),
    stage(vol, "volúmenes", [...ground.shapes, ...back.flatMap((i) => i.shapes)], { pilares_figura: columns.records.length, solidos_delante: front.size, patios_ajedrez: ground.tiled }, columns.records, columns.records.length ? `; T1: ${columns.records.length} pilares de galería SON figuras, de la base a la losa` : ""),
    stage({ ...vol, provenance: { algorithm: "ornamento por superficie (patio/ornamento.ts) pintado JUNTO con su sólido en el orden de precedencia: lo de atrás queda tapado por lo de enfrente", params: { superficies: [...decor.values()].flat().length, anomalyRate: ctx.config.anomalyRate, ...cutsParams(cuts) }, decision: `torre → estrías y roseta; muro de salón → banda, ventanas ciegas y friso; pilar → chevrón; losa y cornisa → greca; aguja → sierpinski; ${SYMMETRY_NOTE}` } }, "ornamento", decorated(back, decor).flatMap((i) => i.shapes), { frisos_habitados: archCounts(t4(back)).T4_frisos, ...archCounts(t4(back)) }, t4(back), rec ? RECURSION_NOTE : ""),
  ];
  if (!placed) return stages;
  const ahead = decorated(solids.filter((x) => front.has(x.id)), decor);
  return [...stages, habitada([...ahead, ...placed.items], forward, [...placed.records, ...t4(ahead)], placed.provenance, front.size)];
}

export function composeInhabitedProgram(program: ArchitectureProgram, view: ProgramView, look: ProgramLook = {}, people?: Inhabitants): InhabitedProgram {
  const built = programScene(program, view);
  const cast = people && people.scene.groups.length ? figureHull(siteOfProgram(built), people.scene) : [];
  const scene = cast.length ? programScene(program, view, cast) : built;
  return { stages: inhabitProgram(scene, programContext(scene, look), people), scene };
}
