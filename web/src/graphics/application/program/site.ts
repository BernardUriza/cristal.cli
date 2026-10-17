import { LAYOUT_RULES } from "../../domain/grammar/dimensions.ts";
import type { PlacedSpace } from "../../domain/grammar/layout.ts";
import type { Rect } from "../../domain/architecture/layout.ts";
import { bboxOf } from "../../domain/grammar/place.ts";
import type { SpaceKind } from "../../domain/grammar/types.ts";
import { boxCenter, boundsOf, type Vec3 } from "../../domain/math/vec3.ts";
import type { Flight, Footing, Site } from "../patio/lugares.ts";
import type { ProgramScene } from "./scene.ts";

const SKY_MARGIN = 4;

const SPAN_OF_WHOLE = 0.5;

const minSide = (p: PlacedSpace) => Math.min(p.rect.x1 - p.rect.x0, p.rect.z1 - p.rect.z0);

const area = (p: PlacedSpace) => (p.rect.x1 - p.rect.x0) * (p.rect.z1 - p.rect.z0);

const NEAR_ENOUGH = 0.5;

const MIN_STRIP = 2;

function largest(s: ProgramScene, kind: SpaceKind, free = false): PlacedSpace | undefined {
  const holds = (p: PlacedSpace) => s.graph.edges.some((e) => e.relation === "contains" && e.from === p.node.id);
  const options = s.layout.spaces.filter((p) => p.node.kind === kind && (!free || !holds(p))).sort((a, b) => area(b) - area(a));
  const depth = (p: PlacedSpace) => s.projector.toNdc([(p.rect.x0 + p.rect.x1) / 2, p.y1, (p.rect.z0 + p.rect.z1) / 2])[2];
  return options.filter((p) => area(p) >= area(options[0]) * NEAR_ENOUGH).sort((a, b) => depth(a) - depth(b))[0];
}

function openFloor(s: ProgramScene, court: PlacedSpace): Rect {
  const inside = s.layout.spaces.filter((p) => p.node.parent === court.node.id).map((p) => p.rect);
  if (inside.length === 0) return court.rect;
  const c = court.rect;
  const b = bboxOf(inside);
  const strips: Rect[] = [{ ...c, z0: b.z1 }, { ...c, z1: b.z0 }, { ...c, x0: b.x1 }, { ...c, x1: b.x0 }].filter((r) => Math.min(r.x1 - r.x0, r.z1 - r.z0) >= MIN_STRIP);
  const depth = (r: Rect) => s.projector.toNdc([(r.x0 + r.x1) / 2, court.y1, (r.z0 + r.z1) / 2])[2];
  return strips.sort((a, b2) => depth(a) - depth(b2))[0] ?? c;
}

function flightOf(s: ProgramScene, stair: PlacedSpace): Flight | undefined {
  const steps = s.volumes.find((v) => v.space.node.id === stair.node.id)?.solids ?? [];
  if (steps.length < 2) return undefined;
  const top = (k: number): Vec3 => {
    const b = boundsOf(steps[k].faces.flatMap((f) => f.points));
    return [boxCenter(b)[0], b.max[1], boxCenter(b)[2]];
  };
  return { from: top(0), to: top(steps.length - 1) };
}

/** Where the program lets creatures stand, sized against half the whole precinct so a giant reads as a building: the nearest of the big empty courtyards (or the free strip of a courtyard that holds a precinct, toward the camera; else the hall, or the precinct), tower spires, flat roofs, stair flights, and the sky over the whole. */
export function siteOfProgram(s: ProgramScene): Site {
  const root = s.layout.spaces.find((p) => !p.node.parent)!;
  const ground = largest(s, "courtyard", true) ?? largest(s, "courtyard") ?? largest(s, "hall") ?? root;
  const floorY = ground.node.kind === "hall" ? ground.y0 : ground.y1;
  const of = (kinds: SpaceKind[], lift: number): Footing[] => s.layout.spaces.filter((p) => kinds.includes(p.node.kind)).map((p) => ({ rect: p.rect, y: p.y1 + lift }));
  const top = Math.max(...s.solids.flatMap((x) => x.faces.flatMap((f) => f.points.map((p) => p[1]))));
  return {
    projector: s.projector,
    span: Math.max(minSide(ground), minSide(root) * SPAN_OF_WHOLE),
    floor: { rect: ground.node.kind === "courtyard" ? openFloor(s, ground) : ground.rect, y: floorY },
    towers: of(["tower"], LAYOUT_RULES.towerRoof),
    roofs: of(["chamber", "gallery", "bridge"], 0),
    stairs: s.layout.spaces.filter((p) => p.node.kind === "stair").flatMap((p) => flightOf(s, p) ?? []),
    sky: { rect: root.rect, y: top + SKY_MARGIN },
  };
}
