import { FIGURE_SCALE } from "../../config/figures.ts";
import type { Group } from "../../config/scene.ts";
import type { Box3, Vec3 } from "../../domain/math/vec3.ts";
import { arrange } from "./acomodo.ts";
import { bodyClears } from "./holgura.ts";
import { crowdOf } from "./protagonista.ts";
import type { Flight, Footing, Site } from "./sitio.ts";

export type Crowd = { spots: Vec3[]; heightM: number; wantedM: number; ground: string[] };

type Candidate = { at: Vec3; label?: string };

type Segment = { from: Vec3; to: Vec3; side: [number, number]; width: number; label?: string };

const STEP_RISE = 0.35;
const SWAY = 0.25;
const SWAY_TURNS = 2;
const LINEAR = new Set<Group["arrangement"]>(["fila", "procesion", "escalera"]);

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

/** The crowd's own arrangement on the first walk that holds it whole (the site's floor, then nearest first); else, for a file, the route through every walk; else whichever keeps the most. */
function onGround(g: Group, c: Site, h: number, clear: (at: Vec3) => boolean): Candidate[] {
  const rise = g.arrangement === "escalera" ? h * STEP_RISE : 0;
  const file = (walks: readonly Footing[]) => fileOn(g, route(walks, c), clear, rise);
  const lay = (f: Footing): Candidate[] => arrange(g, f.rect, f.y, rise).filter(clear).map((at): Candidate => ({ at, label: f.label }));
  const [first, ...rest] = c.walks;
  const singles = [first, ...rest.sort((a, b) => nearness(a, c) - nearness(b, c))].filter(Boolean).map(lay);
  const linear = LINEAR.has(g.arrangement);
  const whole = singles.find((x) => x.length >= g.count);
  if (whole) return whole;
  const options = linear ? [file(c.walks), ...singles] : singles;
  return options.reduce((best, x) => (x.length > best.length ? x : best), [] as Candidate[]);
}

/** Where a group stands off the ground (spires, roofs, stair flights, the sky), or null when its place is the ground. */
export function liftedSpots(g: Group, c: Site, h: number): Vec3[] | null {
  const rise = h * STEP_RISE;
  if (g.place === "torres" && c.towers.length) return Array.from({ length: g.count }, (_, i) => centre(c.towers[i % c.towers.length], Math.floor(i / c.towers.length) * h));
  if (g.place === "azoteas" && c.roofs.length) return Array.from({ length: g.count }, (_, i) => centre(c.roofs[(i * 3) % c.roofs.length], 0));
  if (g.place === "cielo") return arrange({ ...g, arrangement: g.arrangement === "escalera" ? "escalera" : "circulo" }, c.sky.rect, c.sky.y, rise);
  if (g.place === "escalera" && c.stairs.length) return onFlights(g.count, c.stairs, rise);
  return null;
}

const keyOf = (b: Box3) => [...b.min, ...b.max].map((v) => v.toFixed(3)).join(",");

function attempt(g: Group, c: Site, h: number): Candidate[] {
  const own = g.place === "escalera" ? new Set(c.stairs.flatMap((f) => f.steps ?? []).map(keyOf)) : new Set<string>();
  const obstacles = own.size ? c.obstacles.filter((b) => !own.has(keyOf(b))) : c.obstacles;
  const clear = (at: Vec3) => bodyClears(at, h, c.projector.forward, obstacles);
  if (g.place === "escalera" && c.stairs.length) return fileOn({ ...g, arrangement: "escalera" }, c.stairs.map(flightLine), clear, 0);
  const lifted = liftedSpots(g, c, h);
  if (lifted) return lifted.filter(clear).map((at) => ({ at }));
  const ground = g.place === "escalera" ? { ...g, arrangement: "escalera" as const } : g;
  return onGround(ground, c, h, clear);
}

/** A crowd placed so no body enters a solid: at its wanted height when the ground holds everyone, else shrunk toward a human floor, else fewer of them. */
function placeCrowd(g: Group, c: Site): Crowd {
  const wantedM = crowdWantedM(g, c);
  const floor = Math.min(FIGURE_SCALE.crowdFloorM, wantedM);
  const steps = FIGURE_SCALE.crowdShrinkSteps;
  let best: { spots: Candidate[]; h: number } = { spots: [], h: wantedM };
  for (let k = 0; k <= steps; k++) {
    const h = wantedM - ((wantedM - floor) * k) / steps;
    const spots = attempt(g, c, h);
    if (spots.length > best.spots.length) best = { spots, h };
    if (spots.length >= g.count) break;
  }
  const ground = [...new Set(best.spots.flatMap((x) => (x.label ? [x.label] : [])))];
  return { spots: best.spots.map((x) => x.at), heightM: best.h, wantedM, ground };
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
