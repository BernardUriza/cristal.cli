import { pyramid, type Solid } from "../architecture/mass.ts";
import type { Rect } from "../architecture/layout.ts";
import { ARCADE, CONTAINER_MARGIN, KIND_DIMENSIONS, LAYOUT_RULES } from "./dimensions.ts";
import type { PlacedSpace } from "./layout.ts";
import { causeway, crest, precinct, steppedBody, summitTemple } from "./pyramidVolumes.ts";
import { gable, steppedDome } from "./roofs.ts";
import { frameStrips, grow, part, pillarsAlong, walled } from "./solidKit.ts";

const TALL_BUILDING = 12;

const minSide = (r: Rect): number => Math.min(r.x1 - r.x0, r.z1 - r.z0);

const roofTag = (p: PlacedSpace) => ({ kind: "tower-roof" as const, space: p.node.id });

function slab(p: PlacedSpace): Solid[] {
  return [part(p, "floor", "floor", p.rect, p.y0, p.y1)];
}

function frame(p: PlacedSpace, kind: "street-ring" | "ring-gallery"): Rect[] {
  return frameStrips(p.rect, CONTAINER_MARGIN[kind]!);
}

function arcade(p: PlacedSpace): Solid[] {
  const strips = frame(p, "ring-gallery");
  const top = p.y1 + ARCADE.height;
  return strips.flatMap((r, i) => [
    part(p, `floor${i}`, "floor", r, p.y0, p.y1),
    ...pillarsAlong(p, r, p.y1, top - ARCADE.slab, `pier${i}-`),
    part(p, `roof${i}`, "lintel", r, top - ARCADE.slab, top),
  ]);
}

function street(p: PlacedSpace): Solid[] {
  const r = p.rect;
  const alongX = r.x1 - r.x0 >= r.z1 - r.z0;
  const k = LAYOUT_RULES.kerb;
  const kerbs: Rect[] = alongX ? [{ ...r, z1: r.z0 + k }, { ...r, z0: r.z1 - k }] : [{ ...r, x1: r.x0 + k }, { ...r, x0: r.x1 - k }];
  return [...slab(p), ...kerbs.map((kr, i) => part(p, `kerb${i}`, "floor", kr, p.y1, p.y1 + 0.15))];
}

function junction(p: PlacedSpace): Solid[] {
  const c = { x: (p.rect.x0 + p.rect.x1) / 2, z: (p.rect.z0 + p.rect.z1) / 2 };
  const h = LAYOUT_RULES.obelisk / 2;
  const base: Rect = { x0: c.x - h, x1: c.x + h, z0: c.z - h, z1: c.z + h };
  const top = p.y1 + 5;
  return [...slab(p), part(p, "body", "wall", base, p.y1, top), pyramid(`${p.node.id}:spire`, roofTag(p), grow(base, 0.1), top, top + 1.4)];
}

function building(p: PlacedSpace): Solid[] {
  const r = p.rect;
  if (p.y1 - p.y0 >= TALL_BUILDING) {
    const crown = grow(r, -Math.min(1.2, minSide(r) * 0.2));
    return [...walled(p), part(p, "cornice", "lintel", grow(r, 0.25), p.y1 - 0.5, p.y1), part(p, "crown", "wall", crown, p.y1, p.y1 + 2.2)];
  }
  return [...walled(p), gable(`${p.node.id}:gable`, roofTag(p), grow(r, 0.2), p.y1, minSide(r) * 0.35)];
}

function shrine(p: PlacedSpace): Solid[] {
  const r = p.rect;
  const square = Math.abs((r.x1 - r.x0) - (r.z1 - r.z0)) < 0.6;
  const roof = square ? pyramid(`${p.node.id}:spire`, roofTag(p), grow(r, 0.2), p.y1, p.y1 + minSide(r) * 0.9) : gable(`${p.node.id}:gable`, roofTag(p), grow(r, 0.2), p.y1, minSide(r) * 0.45);
  return [...walled(p), roof];
}

function sanctuary(p: PlacedSpace): Solid[] {
  const r = p.rect;
  const s = KIND_DIMENSIONS.sanctuary.slab;
  const shell = [part(p, "body", "wall", r, p.y0, p.y1 - s), part(p, "cornice", "lintel", grow(r, 0.35), p.y1 - s, p.y1)];
  return [...shell, ...steppedDome(`${p.node.id}:dome`, roofTag(p), r, p.y1, 5, 1.2)];
}

/** Volumetry of the R7–R10 spaces (R8 bodies in pyramidVolumes); rings and streets are circulation (floor strips), never a solid mass. */
export function civicSolids(p: PlacedSpace): Solid[] {
  switch (p.node.kind) {
    case "sanctuary": return p.node.style === "pyramid" ? summitTemple(p) : sanctuary(p);
    case "shrine": return shrine(p);
    case "ring-gallery": return arcade(p);
    case "street-ring": return frame(p, "street-ring").map((r, i) => part(p, `lane${i}`, "floor", r, p.y0, p.y1));
    case "street": return street(p);
    case "junction": return junction(p);
    case "building": return building(p);
    case "platform":
    case "altar": return steppedBody(p);
    case "crest": return crest(p);
    case "causeway": return causeway(p);
    case "precinct": return precinct(p);
    case "plaza":
    case "block": return slab(p);
    default: return [];
  }
}
