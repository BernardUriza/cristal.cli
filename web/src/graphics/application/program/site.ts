import type { PlacedSpace } from "../../domain/grammar/layout.ts";
import type { Rect } from "../../domain/architecture/layout.ts";
import { bboxOf } from "../../domain/grammar/place.ts";
import type { SpaceKind } from "../../domain/grammar/types.ts";
import { boxCenter, boundsOf, type Vec3 } from "../../domain/math/vec3.ts";
import { roomOn } from "../patio/protagonista.ts";
import { boxesOf, crownOf, minSideOf, type Flight, type Footing, type Site } from "../patio/sitio.ts";
import type { ProgramScene } from "./scene.ts";
import { walksOfProgram } from "./suelo.ts";

const SKY_MARGIN = 4;

const SPAN_OF_WHOLE = 0.5;

const minSide = (p: PlacedSpace) => Math.min(p.rect.x1 - p.rect.x0, p.rect.z1 - p.rect.z0);

const area = (p: PlacedSpace) => (p.rect.x1 - p.rect.x0) * (p.rect.z1 - p.rect.z0);

const NEAR_ENOUGH = 0.5;
const MIN_STRIP = 2;

const OPEN_GROUND: readonly SpaceKind[] = ["courtyard", "plaza", "platform", "ring-gallery", "complex"];

const WALK_FLOORS: readonly SpaceKind[] = ["courtyard", "plaza"];

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
  return { from: top(0), to: top(steps.length - 1), steps: boxesOf(steps) };
}

/** The open ground with the widest narrow side (a courtyard's free strip or a plaza), where a protagonist fits best. */
function frontStrips(s: ProgramScene, p: PlacedSpace): Rect[] {
  const inside = s.layout.spaces.filter((q) => q.node.parent === p.node.id).map((q) => q.rect);
  if (inside.length === 0) return [p.rect];
  const c = p.rect;
  const b = bboxOf(inside);
  const depth = (r: Rect) => s.projector.toNdc([(r.x0 + r.x1) / 2, p.y1, (r.z0 + r.z1) / 2])[2];
  const behind = depth(b);
  return [{ ...c, z0: b.z1 }, { ...c, z1: b.z0 }, { ...c, x0: b.x1 }, { ...c, x1: b.x0 }].filter((r) => minSideOf(r) >= MIN_STRIP && depth(r) < behind);
}

/** Every uncovered strip of open ground in front of what it holds (courtyards, plazas, terraces, ring walks, the precinct), roomiest first. */
function openGround(s: ProgramScene, floor: Footing): Footing[] {
  const open = s.layout.spaces.filter((p) => OPEN_GROUND.includes(p.node.kind)).flatMap((p) => frontStrips(s, p).map((rect): Footing => ({ rect, y: p.y1 })));
  return open.length ? open.sort((a, b) => roomOn(b, s) - roomOn(a, s)) : [floor];
}

/** Where the program lets creatures stand (crowds walk its streets, plaza, rings and terraces; see suelo.ts), sized against half the whole precinct so a giant reads as a building: the nearest of the big empty courtyards (or the free strip of a courtyard that holds a precinct, toward the camera; else the hall, or the precinct), tower crowns (the ledge at the spire's foot), flat roofs, stair flights, and the sky over the whole. */
export function siteOfProgram(s: ProgramScene): Site {
  const root = s.layout.spaces.find((p) => !p.node.parent)!;
  const ground = largest(s, "courtyard", true) ?? largest(s, "courtyard") ?? largest(s, "plaza") ?? largest(s, "hall") ?? root;
  const floorY = ground.node.kind === "hall" ? ground.y0 : ground.y1;
  const floor: Footing = { rect: ground.node.kind === "courtyard" ? openFloor(s, ground) : ground.rect, y: floorY, ...(ground.node.kind === "hall" ? { ceiling: ground.y1 } : {}) };
  const of = (kinds: SpaceKind[], lift: number): Footing[] => s.layout.spaces.filter((p) => kinds.includes(p.node.kind)).map((p) => ({ rect: p.rect, y: p.y1 + lift }));
  const walks = walksOfProgram(s);
  const solid = (id: string) => s.solids.find((x) => x.id === id);
  const top = Math.max(...s.solids.flatMap((x) => x.faces.flatMap((f) => f.points.map((p) => p[1]))));
  return {
    projector: s.projector,
    span: Math.max(minSide(ground), minSide(root) * SPAN_OF_WHOLE),
    floor,
    walks: WALK_FLOORS.includes(ground.node.kind) ? [{ ...floor, label: ground.node.kind === "plaza" ? "plaza" : "patio" }, ...walks] : walks.length ? walks : [floor],
    stages: openGround(s, floor),
    towers: s.layout.spaces.filter((p) => p.node.kind === "tower").map((p) => crownOf(p.rect, p.y1, solid(`${p.node.id}:roof`), solid(`${p.node.id}:spire`))),
    roofs: of(["chamber", "gallery", "bridge"], 0),
    stairs: s.layout.spaces.filter((p) => p.node.kind === "stair").flatMap((p) => flightOf(s, p) ?? []),
    sky: { rect: root.rect, y: top + SKY_MARGIN },
    obstacles: boxesOf(s.solids),
  };
}
