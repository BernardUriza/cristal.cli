import type { Solid } from "../../domain/architecture/mass.ts";
import { facesTowardCamera, paintFaces, type TaggedFace } from "../drawings/faces.ts";
import type { Projector } from "../projector.ts";
import type { Stage } from "../compose.ts";
import type { ProgramScene } from "./scene.ts";

export function tagged(solids: readonly Solid[]): TaggedFace[] {
  return solids.flatMap((solid) => solid.faces.map((f) => ({ ...f, solid })));
}

function meanDepth(points: TaggedFace["points"], projector: Projector): number {
  let z = 0;
  for (const p of points) z += projector.toNdc(p)[2];
  return z / points.length;
}

function lowest(solid: TaggedFace["solid"]): number {
  return Math.min(...solid.faces.flatMap((f) => f.points.map((p) => p[1])));
}

const spaceOf = (f: TaggedFace): string => f.solid.tag.space ?? f.solid.id;

export function paintOrder(faces: TaggedFace[], projector: Projector): TaggedFace[] {
  const solids = new Map<string, Map<string, TaggedFace["solid"]>>();
  for (const f of faces) solids.set(spaceOf(f), (solids.get(spaceOf(f)) ?? new Map()).set(f.solid.id, f.solid));
  const spaceDepth = new Map([...solids].map(([key, m]) => [key, meanDepth([...m.values()].flatMap((x) => x.faces.flatMap((g) => g.points)), projector)]));
  return faces
    .map((f) => ({ f, space: spaceDepth.get(spaceOf(f))!, y: lowest(f.solid), solid: meanDepth(f.solid.faces.flatMap((x) => x.points), projector), depth: meanDepth(f.points, projector) }))
    .sort((a, b) => b.space - a.space || a.y - b.y || b.solid - a.solid || b.depth - a.depth)
    .map(({ f }) => f);
}

export function groundFaces(s: ProgramScene): TaggedFace[] {
  const slabs = [...s.volumes].sort((a, b) => a.space.y0 - b.space.y0).flatMap((v) => v.solids.filter((x) => x.tag.kind === "floor"));
  return facesTowardCamera(tagged(slabs), s.projector);
}

export function risingFaces(s: ProgramScene): TaggedFace[] {
  return paintOrder(facesTowardCamera(tagged(s.solids.filter((x) => x.tag.kind !== "floor")), s.projector), s.projector);
}

export function volumeStage(s: ProgramScene): Stage {
  const ground = groundFaces(s);
  const rising = risingFaces(s);
  const shapes = [...ground, ...rising].flatMap((f) => paintFaces([f], s.projector, s.style));
  const kinds = new Set(s.volumes.filter((v) => v.solids.some((x) => x.tag.kind !== "floor")).map((v) => v.space.node.kind));
  return {
    name: "volúmenes",
    shapes,
    provenance: {
      algorithm: "rectángulo → sólido por tipo con prism/box/pyramid de mass.ts; losas de recinto y patio primero por altura, luego painter's por sólido (isométrica)",
      params: { sólidos: s.solids.length, caras: ground.length + rising.length, tipos: [...kinds].join(","), azimut: Number(s.view.azimuth.toFixed(3)) },
      decision: "torre alta con pirámide; galería baja de pilares con losa; salón alto con cubierta a dos aguas (cúpula escalonada en templo); escalera en peldaños hacia lo que conecta; puente como losa elevada sobre pilares; patio y recinto como suelo",
    },
  };
}
