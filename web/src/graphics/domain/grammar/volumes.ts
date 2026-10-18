import { pyramid, type Solid } from "../architecture/mass.ts";
import type { Rect } from "../architecture/layout.ts";
import { KIND_DIMENSIONS, LAYOUT_RULES, OPEN_GROUND_STYLES } from "./dimensions.ts";
import type { GraphLayout, PlacedSpace } from "./layout.ts";
import { corridor, openCell } from "./cells.ts";
import { civicSolids } from "./civicVolumes.ts";
import { gable, steppedDome } from "./roofs.ts";
import { grow, part, pillarsAlong, walled } from "./solidKit.ts";
import type { SpaceEdge } from "./types.ts";

export type SpaceSolids = { space: PlacedSpace; solids: Solid[] };

function stair(p: PlacedSpace, toward: Rect | undefined): Solid[] {
  const r = p.rect;
  const heading = p.node.heading;
  const alongX = heading === undefined ? r.x1 - r.x0 >= r.z1 - r.z0 : heading % 180 === 0;
  const length = alongX ? r.x1 - r.x0 : r.z1 - r.z0;
  const n = Math.max(3, Math.round((p.y1 - p.y0) / LAYOUT_RULES.riser));
  const centre = alongX ? (r.x0 + r.x1) / 2 : (r.z0 + r.z1) / 2;
  const target = toward ? (alongX ? (toward.x0 + toward.x1) / 2 : (toward.z0 + toward.z1) / 2) : centre + 1;
  const rising = target >= centre;
  const tread = length / n;
  return Array.from({ length: n }, (_, k) => {
    const from = rising ? k * tread : length - (k + 1) * tread;
    const step: Rect = alongX ? { ...r, x0: r.x0 + from, x1: r.x0 + from + tread } : { ...r, z0: r.z0 + from, z1: r.z0 + from + tread };
    return part(p, `step${k}`, "wall", step, p.y0, p.y0 + ((k + 1) * (p.y1 - p.y0)) / n);
  });
}

function solidsOf(p: PlacedSpace, toward: Rect | undefined): Solid[] {
  const slab = KIND_DIMENSIONS[p.node.kind].slab;
  const r = p.rect;
  if (p.node.style === "labyrinth") {
    if (p.node.kind === "chamber") return openCell(p, p.y1, ["z1", "x0"]);
    if (p.node.kind === "gallery") return corridor(p, p.y0 + 4.6);
    if (p.node.kind === "courtyard") return [part(p, "floor", "floor", r, p.y0, p.y1), ...openCell(p, p.y1 + 1.4, ["z0", "z1", "x0", "x1"])];
  }
  switch (p.node.kind) {
    case "complex": return !p.node.parent && OPEN_GROUND_STYLES.includes(p.node.style) ? [] : [part(p, "plinth", "floor", r, p.y0, p.y1)];
    case "courtyard": return [part(p, "floor", "floor", r, p.y0, p.y1)];
    case "chamber": return walled(p);
    case "hall": {
      const roofY = p.y1;
      const shell = [part(p, "body", "wall", r, p.y0, roofY - slab), part(p, "cornice", "lintel", grow(r, 0.3), roofY - slab, roofY)];
      if (p.node.style === "temple") return [...shell, ...steppedDome(`${p.node.id}:dome`, { kind: "tower-roof", space: p.node.id }, r, roofY, 4, 1.1)];
      return [...shell, gable(`${p.node.id}:gable`, { kind: "tower-roof", space: p.node.id }, grow(r, 0.3), roofY, Math.min(r.x1 - r.x0, r.z1 - r.z0) * 0.32)];
    }
    case "gallery": return [...pillarsAlong(p, r, p.y0, p.y1 - slab, "pier"), part(p, "roof", "lintel", r, p.y1 - slab, p.y1)];
    case "tower": return [...walled(p), pyramid(`${p.node.id}:spire`, { kind: "tower-roof", space: p.node.id }, grow(r, 0.15), p.y1, p.y1 + LAYOUT_RULES.towerRoof)];
    case "stair": return stair(p, toward);
    case "bridge": {
      const inset = Math.min(r.x1 - r.x0, r.z1 - r.z0) * 0.3;
      const piers = pillarsAlong(p, grow(r, -inset), p.y0, p.y1 - slab, "pier").filter((_, i) => i % 2 === 0);
      return [...piers, part(p, "deck", "lintel", r, p.y1 - slab, p.y1)];
    }
    default: return civicSolids(p);
  }
}

export function volumesOf(layout: GraphLayout, edges: readonly SpaceEdge[]): SpaceSolids[] {
  const byId = new Map(layout.spaces.map((s) => [s.node.id, s]));
  return layout.spaces.map((space) => {
    const link = edges.find((e) => e.relation === "connects" && (e.from === space.node.id || e.to === space.node.id));
    const other = link ? byId.get(link.from === space.node.id ? link.to : link.from) : undefined;
    return { space, solids: solidsOf(space, other?.rect) };
  });
}
