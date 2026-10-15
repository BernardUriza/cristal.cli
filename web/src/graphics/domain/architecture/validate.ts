import { rectArea, rectContains, rectOverlapArea, rectDepth, rectWidth } from "./layout.ts";
import { openingSpan, wallLength, type Plan } from "./plan.ts";
import { EXTERIOR, pairKey, type Program } from "./program.ts";

export type Issue = { level: "error" | "warning"; code: string; message: string; subject?: string };

export type ValidationReport = {
  geometric: Issue[];
  architectural: Issue[];
  structural: { status: "not-evaluated"; note: string };
  ok: boolean;
};

export type ArchitecturalRules = { minRoomArea: number; maxRoomAspect: number; minDoorWidth: number };

export const DEFAULT_RULES: ArchitecturalRules = { minRoomArea: 9, maxRoomAspect: 3, minDoorWidth: 0.8 };

const EPS = 1e-6;

export function validateGeometry(plan: Plan): Issue[] {
  const issues: Issue[] = [];
  const err = (code: string, message: string, subject?: string) => issues.push({ level: "error", code, message, subject });
  const { width: W, depth: D } = plan.layout.footprint;
  const ringX = (W - plan.layout.courtyard.width) / 2 - plan.layout.galleryWidth;
  const ringZ = (D - plan.layout.courtyard.depth) / 2 - plan.layout.galleryWidth;
  if (ringX <= 0 || ringZ <= 0) err("ring-depth", `footprint minus courtyard leaves no room ring (x ${ringX}, z ${ringZ})`);
  for (let i = 0; i < plan.spaces.length; i++) {
    const a = plan.spaces[i];
    if (!rectContains(plan.bounds, a.rect)) err("space-outside-footprint", `${a.id} leaves the footprint`, a.id);
    if (rectArea(a.rect) <= EPS) err("space-degenerate", `${a.id} has no area`, a.id);
    for (let j = i + 1; j < plan.spaces.length; j++) {
      const b = plan.spaces[j];
      const overlap = rectOverlapArea(a.rect, b.rect);
      if (overlap > EPS) err("space-overlap", `${a.id} and ${b.id} overlap by ${overlap.toFixed(3)} m²`, pairKey(a.id, b.id));
    }
  }
  const total = plan.spaces.reduce((acc, s) => acc + rectArea(s.rect), 0);
  if (Math.abs(total - rectArea(plan.bounds)) > 1e-6) err("area-mismatch", `spaces cover ${total.toFixed(3)} m² of a ${rectArea(plan.bounds).toFixed(3)} m² footprint`);
  for (const wall of plan.walls) {
    const L = wallLength(wall);
    if (L <= EPS) err("wall-degenerate", `${wall.id} has zero length`, wall.id);
    const spans = wall.openings.map((o) => ({ o, ...openingSpan(wall, o) })).sort((p, q) => p.from - q.from);
    for (let k = 0; k < spans.length; k++) {
      const s = spans[k];
      if (s.from < -EPS || s.to > L + EPS) err("opening-outside-wall", `${s.o.id} spans ${s.from.toFixed(2)}..${s.to.toFixed(2)} on a ${L.toFixed(2)} m wall`, s.o.id);
      if (s.o.sill + s.o.height > wall.height + EPS) err("opening-taller-than-wall", `${s.o.id} reaches ${(s.o.sill + s.o.height).toFixed(2)} m on a ${wall.height.toFixed(2)} m wall`, s.o.id);
      if (k > 0 && spans[k - 1].to > s.from + EPS) err("openings-overlap", `${spans[k - 1].o.id} and ${s.o.id} overlap on ${wall.id}`, wall.id);
    }
  }
  return issues;
}

function reachableFromExterior(plan: Plan): Set<string> {
  const adjacency = new Map<string, Set<string>>();
  const link = (a: string, b: string) => {
    if (!adjacency.has(a)) adjacency.set(a, new Set());
    adjacency.get(a)!.add(b);
  };
  for (const o of plan.openings) {
    link(o.between[0], o.between[1]);
    link(o.between[1], o.between[0]);
  }
  const seen = new Set<string>([EXTERIOR]);
  const queue = [EXTERIOR];
  while (queue.length) {
    const cur = queue.shift()!;
    for (const next of adjacency.get(cur) ?? []) if (!seen.has(next)) {
      seen.add(next);
      queue.push(next);
    }
  }
  return seen;
}

export function validateArchitecture(plan: Plan, program: Program, rules = DEFAULT_RULES): Issue[] {
  const issues: Issue[] = [];
  const err = (code: string, message: string, subject?: string) => issues.push({ level: "error", code, message, subject });
  const warn = (code: string, message: string, subject?: string) => issues.push({ level: "warning", code, message, subject });
  const planned = new Set(plan.spaces.map((s) => s.id));
  for (const s of program.spaces) if (!planned.has(s.id)) err("space-unplaced", `${s.id} is in the program but has no rect`, s.id);
  const realized = new Set(plan.openings.map((o) => pairKey(o.between[0], o.between[1])));
  for (const adj of [...program.adjacencies, program.entrance]) {
    const key = pairKey(adj.a, adj.b);
    if (!realized.has(key)) err("adjacency-unrealized", `${adj.a} ↔ ${adj.b} (${adj.access}) has no opening`, key);
  }
  const reachable = reachableFromExterior(plan);
  for (const s of plan.spaces) if (!reachable.has(s.id)) err("space-unreachable", `${s.id} cannot be reached from the exterior`, s.id);
  for (const s of plan.spaces) {
    if (s.kind !== "room") continue;
    const area = rectArea(s.rect);
    const aspect = Math.max(rectWidth(s.rect), rectDepth(s.rect)) / Math.min(rectWidth(s.rect), rectDepth(s.rect));
    if (area < rules.minRoomArea) warn("room-small", `${s.id} is ${area.toFixed(1)} m² (< ${rules.minRoomArea})`, s.id);
    if (aspect > rules.maxRoomAspect) warn("room-elongated", `${s.id} aspect ${aspect.toFixed(2)} (> ${rules.maxRoomAspect})`, s.id);
  }
  for (const o of plan.openings) if (o.kind === "door" && o.width < rules.minDoorWidth) err("door-narrow", `${o.id} is ${o.width} m wide`, o.id);
  const courtyard = plan.spaces.find((s) => s.kind === "courtyard");
  if (courtyard) {
    const bad = plan.walls.filter((w) => (w.left === courtyard.id || w.right === courtyard.id) && [w.left, w.right].some((id) => plan.spaces.find((s) => s.id === id)?.kind !== "gallery" && id !== courtyard.id));
    if (bad.length) err("courtyard-not-enclosed", `courtyard touches non-gallery spaces: ${bad.map((w) => w.id).join(", ")}`, courtyard.id);
  }
  const b = plan.bounds;
  const corners = [[b.x0, b.z0], [b.x1, b.z0], [b.x0, b.z1], [b.x1, b.z1]];
  for (const [cx, cz] of corners) {
    const tower = plan.spaces.find((s) => s.kind === "tower" && (s.rect.x0 === cx || s.rect.x1 === cx) && (s.rect.z0 === cz || s.rect.z1 === cz));
    if (!tower) err("tower-missing-at-corner", `no tower occupies footprint corner (${cx}, ${cz})`);
  }
  return issues;
}

export function validatePlan(plan: Plan, program: Program, rules = DEFAULT_RULES): ValidationReport {
  const geometric = validateGeometry(plan);
  const architectural = validateArchitecture(plan, program, rules);
  const hasError = (list: Issue[]) => list.some((i) => i.level === "error");
  return {
    geometric,
    architectural,
    structural: { status: "not-evaluated", note: "No load path, span or bearing check exists yet; proportions here are drawing conventions, not buildability." },
    ok: !hasError(geometric) && !hasError(architectural),
  };
}
