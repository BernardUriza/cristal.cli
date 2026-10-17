import { LAYOUT_RULES, OPEN_GROUND_STYLES } from "../../domain/grammar/dimensions.ts";
import type { PlacedSpace } from "../../domain/grammar/layout.ts";
import { sharedEdge } from "../../domain/grammar/place.ts";
import type { Relation, SpaceKind } from "../../domain/grammar/types.ts";
import type { Rect } from "../../domain/architecture/layout.ts";
import { filled, line, polygon, polyline, rect, stroked, type Shape, type Style, type Vec2 } from "../../domain/shapes.ts";
import type { Palette } from "../../config/palettes.ts";
import type { Stage } from "../compose.ts";
import type { ProgramScene } from "./scene.ts";

const FILL: Record<SpaceKind, keyof Palette> = {
  complex: "wall",
  courtyard: "floorB",
  hall: "primary",
  gallery: "accent",
  tower: "deep",
  stair: "gold",
  chamber: "secondary",
  bridge: "accent",
};

const LINK: Partial<Record<Relation, { color: keyof Palette; width: number }>> = {
  connects: { color: "ink", width: 1.6 },
  faces: { color: "secondary", width: 1.2 },
  bridges: { color: "primary", width: 2.6 },
};

function footprint(s: ProgramScene, r: Rect, y: number, style: Style): Shape {
  const pts: Vec2[] = [[r.x0, r.z0], [r.x1, r.z0], [r.x1, r.z1], [r.x0, r.z1]].map(([x, z]) => s.projector.toScreen([x, y, z]));
  return polygon(pts, style);
}

function streetEdge(s: ProgramScene, r: Rect, style: Style): Shape {
  const pts: Vec2[] = [[r.x0, r.z0], [r.x1, r.z0], [r.x1, r.z1], [r.x0, r.z1], [r.x0, r.z0]].map(([x, z]) => s.projector.toScreen([x, 0, z]));
  return polyline(pts, style);
}

function centre(s: ProgramScene, p: PlacedSpace): Vec2 {
  return s.projector.toScreen([(p.rect.x0 + p.rect.x1) / 2, p.y0, (p.rect.z0 + p.rect.z1) / 2]);
}

function door(s: ProgramScene, a: PlacedSpace, b: PlacedSpace): Shape | undefined {
  if (sharedEdge(a.rect, b.rect) < LAYOUT_RULES.minShared - 1e-6) return undefined;
  const x0 = Math.max(a.rect.x0, b.rect.x0), x1 = Math.min(a.rect.x1, b.rect.x1);
  const z0 = Math.max(a.rect.z0, b.rect.z0), z1 = Math.min(a.rect.z1, b.rect.z1);
  const mx = (x0 + x1) / 2, mz = (z0 + z1) / 2, h = 0.7;
  const gap: Rect = x1 - x0 > z1 - z0 ? { x0: mx - h, x1: mx + h, z0: mz - 0.3, z1: mz + 0.3 } : { x0: mx - 0.3, x1: mx + 0.3, z0: mz - h, z1: mz + h };
  return footprint(s, gap, Math.max(a.y0, b.y0), { fill: s.pal.bg, stroke: s.pal.ink, strokeWidth: 0.6 });
}

export function programStage(s: ProgramScene): Stage {
  const { graph, layout, pal, projector } = s;
  const byId = new Map(layout.spaces.map((p) => [p.node.id, p]));
  const ground = layout.spaces.filter((p) => p.node.level === 0 || p.node.kind === "bridge").sort((a, b) => a.y0 - b.y0);
  const shapes: Shape[] = [rect(0, 0, projector.viewport.width, projector.viewport.height, { fill: pal.bg })];
  for (const p of ground) {
    const open = !p.node.parent && OPEN_GROUND_STYLES.includes(p.node.style);
    const look = filled(pal[FILL[p.node.kind]], pal.ink, 1, { opacity: p.node.kind === "complex" ? 0.35 : 0.55 });
    shapes.push(open ? streetEdge(s, p.rect, stroked(pal.ink, 0.8, { opacity: 0.5 })) : footprint(s, p.rect, p.y0, look));
  }
  for (const e of graph.edges) {
    const look = LINK[e.relation];
    const a = byId.get(e.from), b = byId.get(e.to);
    if (!look || !a || !b) continue;
    shapes.push(line(centre(s, a), centre(s, b), { stroke: pal[look.color], strokeWidth: look.width, opacity: 0.85 }));
    if (e.relation === "connects") {
      const gap = door(s, a, b);
      if (gap) shapes.push(gap);
    }
  }
  const kinds: Record<string, number> = {};
  for (const n of graph.nodes) kinds[n.kind] = (kinds[n.kind] ?? 0) + 1;
  const relations: Record<string, number> = {};
  for (const e of graph.edges) relations[e.relation] = (relations[e.relation] ?? 0) + 1;
  return {
    name: "programa",
    shapes,
    provenance: {
      algorithm: "gramática de reescritura tipada R1–R6 sobre un grafo espacial; solver de rectángulos por contención, adyacencia con hueco y pasarelas; planta proyectada al suelo",
      params: {
        arquetipo: graph.archetype,
        reglas: graph.applied.map((a) => `${a.rule}@${a.target}${a.origin === "completion" ? "*" : ""}`).join(" → "),
        ...Object.fromEntries(Object.entries(kinds).map(([k, v]) => [`n_${k}`, v])),
        ...Object.fromEntries(Object.entries(relations).map(([k, v]) => [`r_${k}`, v])),
      },
      decision: [`* = expansión completada con PRNG sembrado`, ...graph.fallbacks, ...layout.fallbacks].join("; "),
    },
  };
}
