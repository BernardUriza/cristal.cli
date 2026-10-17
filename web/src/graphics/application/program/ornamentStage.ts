import { PATIO_LAYOUT, patioStyle, resolvePatio, type PatioConfig } from "../../config/patio.ts";
import type { Building } from "../../domain/architecture/mass.ts";
import { boundsOf } from "../../domain/math/vec3.ts";
import { makeLod } from "../../domain/lod.ts";
import type { Shape } from "../../domain/shapes.ts";
import { mulberry32 } from "../../../shared/rng.ts";
import type { Stage } from "../compose.ts";
import { paintFaces, type TaggedFace } from "../drawings/faces.ts";
import { frameOf, mapShapes, projectedSize } from "../patio/frame.ts";
import { ornamentFor } from "../patio/ornamento.ts";
import type { Surface, SurfaceRole } from "../patio/surfaces.ts";
import type { PatioContext } from "../patio/types.ts";
import type { SpaceKind } from "../../domain/grammar/types.ts";
import type { ProgramScene } from "./scene.ts";
import { risingFaces } from "./volumeStage.ts";

const BODY_WALLS: readonly SpaceKind[] = ["building", "shrine", "sanctuary"];

export function roleOf(face: TaggedFace, s: ProgramScene): SurfaceRole | undefined {
  const space = s.layout.spaces.find((p) => p.node.id === face.solid.tag.space);
  if (!space) return undefined;
  const vertical = Math.abs(face.normal[1]) < 1e-6;
  const part = face.solid.id.split(":")[1] ?? "";
  if (!vertical) return space.node.kind === "tower" && part === "spire" ? "cubierta-torre" : undefined;
  if ((space.node.kind === "tower" || space.node.kind === "junction") && part === "body") return "torre";
  if (BODY_WALLS.includes(space.node.kind) && (part === "body" || part === "crown")) return "muro-exterior";
  if (space.node.kind === "ring-gallery") return part.startsWith("roof") ? "dintel-arcada" : part.startsWith("pier") ? "pilar" : undefined;
  if (space.node.kind === "sanctuary" && part === "cornice") return "dintel-arcada";
  if ((space.node.kind === "hall" || space.node.kind === "chamber") && part === "body") return "muro-exterior";
  if (part.startsWith("cell")) return "muro-exterior";
  if (space.node.kind === "gallery") return part === "roof" ? "dintel-arcada" : "pilar";
  if (space.node.kind === "hall" && part === "cornice") return "dintel-arcada";
  return undefined;
}

export function programContext(s: ProgramScene, input: Partial<PatioConfig> = {}): PatioContext {
  const seed = input.seed ?? s.graph.nodes.length + s.solids.length;
  const config = resolvePatio({ ...input, seed, palette: s.view.palette, width: s.view.width, height: s.view.height, azimuth: s.view.azimuth });
  const plan = { programId: "grammar", layout: PATIO_LAYOUT, bounds: s.layout.bounds, spaces: [], walls: [], openings: [] };
  const building: Building = { plan, solids: s.solids, bounds: boundsOf(s.solids.flatMap((x) => x.faces.flatMap((f) => f.points))) };
  return { config, building, projector: s.projector, pal: s.pal, style: patioStyle(s.view.palette), lod: makeLod({ detailScale: 1 }), rng: mulberry32(seed) };
}

export function ornamentStage(s: ProgramScene): Stage {
  const ctx = programContext(s);
  const shapes: Shape[] = [];
  const count: Record<string, number> = {};
  for (const face of risingFaces(s)) {
    shapes.push(...paintFaces([face], s.projector, s.style));
    const role = roleOf(face, s);
    if (!role) continue;
    const frame = frameOf(face.points, face.normal, s.projector);
    const surface: Surface = { face, role, frame, px: projectedSize(frame, s.projector), space: face.solid.tag.space };
    const local = ornamentFor(surface, ctx);
    if (local.length === 0) continue;
    count[role] = (count[role] ?? 0) + 1;
    shapes.push(...mapShapes(local, frame, s.projector));
  }
  return {
    name: "ornamento",
    shapes,
    provenance: {
      algorithm: "hook a los pintores de patio/ornamento.ts (ornamentFor) con Surface construida desde la cara; cada cara se repinta en orden painter's y su ornamento va inmediatamente después, así lo de atrás queda ocluido",
      params: { detalle: ctx.config.detail, densidad: ctx.config.density, ...count },
      decision: "torre → estrías y roseta; muro de salón o cámara → banda bajo cornisa y ventanas ciegas; pilar de galería → chevrón; losa de galería y cornisa → greca; aguja de torre → sierpinski",
    },
  };
}
