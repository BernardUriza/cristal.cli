import { FIGURE_SCALE } from "../../config/figures.ts";
import type { Group } from "../../config/scene.ts";
import type { Box3, Vec3 } from "../../domain/math/vec3.ts";
import { arrange } from "./acomodo.ts";
import { bodyClears } from "./holgura.ts";
import { crowdOf } from "./protagonista.ts";
import { minSideOf, type Flight, type Footing, type Site } from "./sitio.ts";

export type Regrouped = { from: Group["arrangement"]; to: Group["arrangement"] };

export type Crowd = { spots: Vec3[]; heightM: number; wantedM: number; ground: string[]; perched?: number; regrouped?: Regrouped };

type Candidate = { at: Vec3; label?: string };

type Placement = { spots: Candidate[]; perched?: number; regrouped?: Regrouped };

type Segment = { from: Vec3; to: Vec3; side: [number, number]; width: number; label?: string };

const STEP_RISE = 0.35;
const SWAY = 0.25;
const SWAY_TURNS = 2;
const LINEAR = new Set<Group["arrangement"]>(["fila", "procesion", "escalera"]);
const AREAL = new Set<Group["arrangement"]>(["circulo", "corona", "espiral", "reticula"]);

export const crowdWantedM = (g: Group, c: Site) => Math.max(FIGURE_SCALE.minHeightM, (c.span * FIGURE_SCALE.crowd * g.scale) / crowdOf(g));

function axisOf(f: Footing): Segment {
  const { x0, x1, z0, z1 } = f.rect;
  const cx = (x0 + x1) / 2;
  const cz = (z0 + z1) / 2;
  return x1 - x0 >= z1 - z0
    ? { from: [x0, f.y, cz], to: [x1, f.y, cz], side: [0, 1], width: z1 - z0, label: f.label }
    : { from: [cx, f.y, z0], to: [cx, f.y, z1], side: [1, 0], width: x1 - x0, label: f.label };
}

const gap = (a: Vec3, b: Vec3) => Math.hypot(a[0] - b[0], a[2] - b[2]);

/** The walks' centre lines chained nearest-first from the one closest to the camera, so a file of figures runs through them in order. */
function route(walks: readonly Footing[], c: Site): Segment[] {
  const left = walks.map(axisOf).sort((a, b) => c.projector.toNdc(a.from)[2] - c.projector.toNdc(b.from)[2]);
  const out: Segment[] = left.length ? [left.shift()!] : [];
  while (left.length) {
    const end = out[out.length - 1].to;
    const near = (s: Segment) => Math.min(gap(end, s.from), gap(end, s.to));
    const i = left.reduce((best, s, k) => (near(s) < near(left[best]) ? k : best), 0);
    const s = left.splice(i, 1)[0];
    out.push(gap(end, s.from) <= gap(end, s.to) ? s : { ...s, from: s.to, to: s.from });
  }
  return out;
}

function alongRoute(g: Group, segments: readonly Segment[], samples: number): Candidate[] {
  const total = segments.reduce((sum, s) => sum + gap(s.from, s.to), 0);
  if (total <= 0) return [];
  return Array.from({ length: samples }, (_, k) => {
    let d = ((k + 0.5) / samples) * total;
    const s = segments.find((x) => (d -= gap(x.from, x.to)) <= 0) ?? segments[segments.length - 1];
    const len = gap(s.from, s.to);
    const t = Math.min(1, Math.max(0, (d + len) / Math.max(len, 1e-9)));
    const sway = g.arrangement === "procesion" ? Math.sin((k / samples) * Math.PI * 2 * SWAY_TURNS) * s.width * SWAY : 0;
    return { at: [s.from[0] + (s.to[0] - s.from[0]) * t + s.side[0] * sway, s.from[1] + (s.to[1] - s.from[1]) * t, s.from[2] + (s.to[2] - s.from[2]) * t + s.side[1] * sway], label: s.label };
  });
}

const evenly = <T,>(xs: readonly T[], n: number): T[] => (xs.length <= n ? [...xs] : Array.from({ length: n }, (_, i) => xs[n === 1 ? Math.floor(xs.length / 2) : Math.round((i * (xs.length - 1)) / (n - 1))]));

function onFlights(n: number, flights: readonly Flight[], rise: number): Vec3[] {
  return Array.from({ length: n }, (_, i): Vec3 => {
    const f = flights[i % flights.length];
    const lap = Math.floor(i / flights.length);
    const per = Math.ceil(n / flights.length);
    const t = per === 1 ? 0.5 : lap / (per - 1);
    return [f.from[0] + (f.to[0] - f.from[0]) * t, f.from[1] + (f.to[1] - f.from[1]) * t + lap * rise * 0.5, f.from[2] + (f.to[2] - f.from[2]) * t];
  });
}

/** A file of the group along the segments: dense samples kept where a body clears, then the group spread evenly over them. */
function fileOn(g: Group, segments: readonly Segment[], clear: (at: Vec3) => boolean, rise: number): Candidate[] {
  const free = alongRoute(g, segments, Math.max(FIGURE_SCALE.crowdSamples, g.count * 4)).filter((x) => clear(x.at));
  return evenly(free, g.count).map((x, i): Candidate => ({ at: [x.at[0], x.at[1] + i * rise, x.at[2]], label: x.label })).filter((x) => clear(x.at));
}

const flightLine = (f: Flight): Segment => ({ from: f.from, to: f.to, side: [0, 0], width: 0, label: "su tramo" });

const centre = (f: Footing, lift: number): Vec3 => [(f.rect.x0 + f.rect.x1) / 2, f.y + lift, (f.rect.z0 + f.rect.z1) / 2];

const nearness = (f: Footing, c: Site) => c.projector.toNdc(centre(f, 0))[2];

const most = (xs: readonly Candidate[][]): Candidate[] => xs.reduce((best, x) => (x.length > best.length ? x : best), [] as Candidate[]);

/** Walks in the order a crowd tries them: an areal arrangement (circle, grid, spiral) the widest first; a file the site's floor, then nearest first. */
function walkOrder(g: Group, c: Site): Footing[] {
  if (AREAL.has(g.arrangement)) return [...c.walks].sort((a, b) => minSideOf(b.rect) - minSideOf(a.rect) || nearness(a, c) - nearness(b, c));
  const [first, ...rest] = c.walks;
  return [first, ...rest.sort((a, b) => nearness(a, c) - nearness(b, c))].filter(Boolean);
}

/** The crowd's own arrangement on the first walk that holds it whole; an areal one that fits no walk becomes a procession along the chained route; a file takes the route; else whichever keeps the most. */
function onGround(g: Group, c: Site, h: number, clear: (at: Vec3) => boolean): Placement {
  const rise = g.arrangement === "escalera" ? h * STEP_RISE : 0;
  const file = (walks: readonly Footing[], as: Group = g) => fileOn(as, route(walks, c), clear, rise);
  const lay = (f: Footing): Candidate[] => arrange(g, f.rect, f.y, rise).filter(clear).map((at): Candidate => ({ at, label: f.label }));
  const singles = walkOrder(g, c).map(lay);
  const whole = singles.find((x) => x.length >= g.count);
  if (whole) return { spots: whole };
  if (AREAL.has(g.arrangement) && c.walks.length > 1) {
    const walked = file(c.walks, { ...g, arrangement: "procesion" });
    if (walked.length >= g.count) return { spots: walked, regrouped: { from: g.arrangement, to: "procesion" } };
  }
  return { spots: most(LINEAR.has(g.arrangement) ? [file(c.walks), ...singles] : singles) };
}

/** One figure per tower top, in site order; whoever is left walks the site's ground. */
function onTowers(g: Group, c: Site, h: number, clear: (at: Vec3) => boolean): Placement {
  const top = c.towers.slice(0, g.count).map((t): Candidate => ({ at: centre(t, 0) })).filter((x) => clear(x.at));
  if (top.length >= g.count) return { spots: top, perched: top.length };
  const rest = onGround({ ...g, count: g.count - top.length }, c, h, clear);
  return { spots: [...top, ...rest.spots], perched: top.length, regrouped: rest.regrouped };
}

/** Where a group stands off the ground (spires, roofs, stair flights, the sky), or null when its place is the ground. */
export function liftedSpots(g: Group, c: Site, h: number): Vec3[] | null {
  const rise = h * STEP_RISE;
  if (g.place === "torres" && c.towers.length) return c.towers.slice(0, g.count).map((t) => centre(t, 0));
  if (g.place === "azoteas" && c.roofs.length) return Array.from({ length: g.count }, (_, i) => centre(c.roofs[(i * 3) % c.roofs.length], 0));
  if (g.place === "cielo") return arrange({ ...g, arrangement: g.arrangement === "escalera" ? "escalera" : "circulo" }, c.sky.rect, c.sky.y, rise);
  if (g.place === "escalera" && c.stairs.length) return onFlights(g.count, c.stairs, rise);
  return null;
}

const keyOf = (b: Box3) => [...b.min, ...b.max].map((v) => v.toFixed(3)).join(",");

function attempt(g: Group, c: Site, h: number): Placement {
  const own = g.place === "escalera" ? new Set(c.stairs.flatMap((f) => f.steps ?? []).map(keyOf)) : new Set<string>();
  const obstacles = own.size ? c.obstacles.filter((b) => !own.has(keyOf(b))) : c.obstacles;
  const clear = (at: Vec3) => bodyClears(at, h, c.projector.forward, obstacles);
  if (g.place === "escalera" && c.stairs.length) return { spots: fileOn({ ...g, arrangement: "escalera" }, c.stairs.map(flightLine), clear, 0) };
  if (g.place === "torres" && c.towers.length) return onTowers(g, c, h, clear);
  const lifted = liftedSpots(g, c, h);
  if (lifted) return { spots: lifted.filter(clear).map((at) => ({ at })) };
  const ground = g.place === "escalera" ? { ...g, arrangement: "escalera" as const } : g;
  return onGround(ground, c, h, clear);
}

/** A crowd placed so no body enters a solid: at its wanted height when the ground holds everyone, else shrunk toward a human floor, else fewer of them. */
function placeCrowd(g: Group, c: Site): Crowd {
  const wantedM = crowdWantedM(g, c);
  const floor = Math.min(FIGURE_SCALE.crowdFloorM, wantedM);
  const steps = FIGURE_SCALE.crowdShrinkSteps;
  let best: Placement & { h: number } = { spots: [], h: wantedM };
  for (let k = 0; k <= steps; k++) {
    const h = wantedM - ((wantedM - floor) * k) / steps;
    const placed = attempt(g, c, h);
    if (placed.spots.length > best.spots.length) best = { ...placed, h };
    if (placed.spots.length >= g.count) break;
  }
  const ground = [...new Set(best.spots.flatMap((x) => (x.label ? [x.label] : [])))];
  const extra = { ...(best.perched !== undefined ? { perched: best.perched } : {}), ...(best.regrouped ? { regrouped: best.regrouped } : {}) };
  return { spots: best.spots.map((x) => x.at), heightM: best.h, wantedM, ground, ...extra };
}

const memo = new WeakMap<Site, WeakMap<Group, Crowd>>();

export function crowdOn(g: Group, c: Site): Crowd {
  const bySite = memo.get(c) ?? new WeakMap<Group, Crowd>();
  memo.set(c, bySite);
  const hit = bySite.get(g);
  if (hit) return hit;
  const placed = placeCrowd(g, c);
  bySite.set(g, placed);
  return placed;
}
