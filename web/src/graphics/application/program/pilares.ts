import { REWRITES } from "../../config/rewrites.ts";
import { dot } from "../../domain/math/vec3.ts";
import type { MotifDef } from "../../domain/motifs/figures/types.ts";
import { caryatid } from "../../domain/rewrite/caryatid.ts";
import { applyRewrite, type Ink } from "../../domain/rewrite/rewrite.ts";
import { mulberry32 } from "../../../shared/rng.ts";
import type { TaggedFace } from "../drawings/faces.ts";
import type { Columns } from "../patio/columnas.ts";
import { partOnFace } from "../patio/facePart.ts";
import { frameOf, toWorld } from "../patio/frame.ts";
import type { PatioContext } from "../patio/types.ts";
import type { ProgramScene } from "./scene.ts";

const MIN_PIER_H = 2;
const MAX_PIER_W = 2.5;

function galleryPiers(s: ProgramScene, faces: readonly TaggedFace[]): Map<string, TaggedFace> {
  const galleries = new Set(s.layout.spaces.filter((p) => p.node.kind === "gallery").map((p) => p.node.id));
  const best = new Map<string, TaggedFace>();
  for (const f of faces) {
    const [space, part] = f.solid.id.split(":");
    if (!galleries.has(space) || !part?.startsWith("pier") || Math.abs(f.normal[1]) > 0.1) continue;
    const prior = best.get(f.solid.id);
    if (!prior || dot(f.normal, s.projector.forward) < dot(prior.normal, s.projector.forward)) best.set(f.solid.id, f);
  }
  return best;
}

/** T1 on the program's gallery piers: the whole pier, base to lintel, IS the figure, on its most camera-facing side. */
export function pilares(s: ProgramScene, ctx: PatioContext, faces: readonly TaggedFace[], ink: Ink, head: MotifDef | undefined, seed: number, reason: string): Columns {
  const out: Columns = { bySolid: new Map(), records: [] };
  const rng = mulberry32(seed ^ 0x51ed27);
  const rule = { rewrite: REWRITES.T1_COLUMN_AS_BODY, produce: caryatid(head) };
  for (const [id, face] of galleryPiers(s, faces)) {
    const frame = frameOf(face.points, face.normal, ctx.projector);
    if (frame.height < MIN_PIER_H || frame.width > MAX_PIER_W) continue;
    const w = frame.width;
    const pier = partOnFace(frame, ctx.projector, { x0: 0, y0: 0, x1: w, y1: frame.height }, `${id}.pilar`, "support", "pilar", {
      base: ctx.projector.toScreen(toWorld(frame, w / 2, frame.height)),
      capital: ctx.projector.toScreen(toWorld(frame, w / 2, 0)),
    });
    const made = applyRewrite(rule, pier, { depth: 0, seed, reason, rng, ink });
    if (!("part" in made)) continue;
    out.bySolid.set(id, { faces: [], figure: made.shapes });
    out.records.push(...made.records);
  }
  return out;
}
