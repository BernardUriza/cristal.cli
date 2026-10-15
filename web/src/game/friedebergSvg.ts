import { concentricCircles, logSpiralPoints, mulberry32, pt, radialLines, regularPoints, starPoints, type Rng } from "./svgPrimitives.ts";

export type Palette = {
  bg: string;
  ink: string;
  primary: string;
  secondary: string;
  accent: string;
  gold: string;
  floorA: string;
  floorB: string;
  void: string;
};

export const PALETTES: Record<string, Palette> = {
  friedeberg: {
    bg: "#f3e7c6",
    ink: "#1a1412",
    primary: "#d4206b",
    secondary: "#23b3a4",
    accent: "#e9a93a",
    gold: "#c89a2a",
    floorA: "#1a1412",
    floorB: "#f3e7c6",
    void: "#2a2f6b",
  },
  noche: {
    bg: "#0b0b12",
    ink: "#f1e6c8",
    primary: "#ff4fa3",
    secondary: "#33ddff",
    accent: "#ffcc4d",
    gold: "#e0b24a",
    floorA: "#0b0b12",
    floorB: "#33ff99",
    void: "#000000",
  },
};

export type FriedebergConfig = {
  seed: number;
  width: number;
  height: number;
  palette: Palette;
  density: number;
  complexity: number;
  horizon: number;
  focal: number;
  camHeight: number;
  columns?: number;
};

export const DEFAULT_CONFIG: FriedebergConfig = {
  seed: 7,
  width: 1200,
  height: 900,
  palette: PALETTES.friedeberg,
  density: 0.6,
  complexity: 3,
  horizon: 0.55,
  focal: 0.7,
  camHeight: 1.7,
};

export type Column = { x: number; z: number; h: number; r: number };
export type Arch = { x0: number; x1: number; z: number; y: number; r: number; nested: number };
export type Dome = { x: number; z: number; y: number; r: number; ribs: number; tiers: number };
export type Scene = {
  floor: { tile: number; xMin: number; xMax: number; zMin: number; zMax: number };
  platform: { halfWidth: number; z: number; steps: number; stepHeight: number };
  columns: Column[];
  arches: Arch[];
  entablature: { halfWidth: number; z: number; y: number; h: number; triglyphs: number };
  dome: Dome;
  sun: { u: number; v: number; rays: number };
  stars: number;
};

export type View = {
  cx: number;
  hy: number;
  f: number;
  camH: number;
  project: (x: number, y: number, z: number) => [number, number];
};

export function makeView(cfg: FriedebergConfig): View {
  const cx = cfg.width / 2;
  const hy = cfg.height * cfg.horizon;
  const f = cfg.width * cfg.focal;
  const camH = cfg.camHeight;
  return { cx, hy, f, camH, project: (x, y, z) => [cx + (x * f) / z, hy + ((camH - y) * f) / z] };
}

export function buildScene(cfg: FriedebergConfig, rng: Rng): Scene {
  const nCols = cfg.columns ?? [5, 7, 9][Math.floor(rng() * 3)];
  const spacing = 2.4;
  const half = ((nCols - 1) / 2) * spacing;
  const z = 20;
  const h = 4.2 + rng() * 1.2;
  const r = 0.3;
  const columns: Column[] = [];
  for (let i = 0; i < nCols; i++) columns.push({ x: -half + i * spacing, z, h, r });
  const arches: Arch[] = [];
  const archR = spacing / 2 - r;
  for (let i = 0; i < nCols - 1; i++) {
    arches.push({ x0: columns[i].x + r, x1: columns[i + 1].x - r, z, y: h, r: archR, nested: Math.max(0, cfg.complexity - 2) });
  }
  const entY = h + archR + 0.1;
  const entH = 0.6;
  const dome: Dome = { x: 0, z, y: entY + entH, r: spacing * 0.8, ribs: [8, 12, 16][Math.floor(rng() * 3)], tiers: Math.min(cfg.complexity, 2) };
  return {
    floor: { tile: 1.25, xMin: -16, xMax: 16, zMin: 2.4, zMax: 46 },
    platform: { halfWidth: half + 1.8, z, steps: 3, stepHeight: 0.22 },
    columns,
    arches,
    entablature: { halfWidth: half + 0.9, z, y: entY, h: entH, triglyphs: nCols * 2 + 1 },
    dome,
    sun: { u: 0.5, v: 0.13, rays: 12 + 4 * cfg.complexity },
    stars: Math.round(24 + 72 * cfg.density),
  };
}

type Facade = { X: (x: number) => number; Y: (y: number) => number; s: number };

function facade(view: View, z: number): Facade {
  const s = view.f / z;
  return { X: (x) => view.cx + x * s, Y: (y) => view.hy + (view.camH - y) * s, s };
}

function rect(x: number, y: number, w: number, h: number, fill: string, stroke: string, sw = 1.2): string {
  return `<rect x="${x.toFixed(1)}" y="${y.toFixed(1)}" width="${w.toFixed(1)}" height="${h.toFixed(1)}" fill="${fill}" stroke="${stroke}" stroke-width="${sw}"/>`;
}

function poly(points: string, fill: string, stroke: string, sw = 1): string {
  return `<polygon points="${points}" fill="${fill}" stroke="${stroke}" stroke-width="${sw}" stroke-linejoin="round"/>`;
}

function quad(a: [number, number], b: [number, number], c: [number, number], d: [number, number]): string {
  return `${pt(...a)} ${pt(...b)} ${pt(...c)} ${pt(...d)}`;
}

export function drawPattern(view: View, scene: Scene, pal: Palette, density: number): string {
  const { tile, xMin, xMax, zMin, zMax } = scene.floor;
  let out = "";
  for (let z = zMax; z > zMin; z -= tile) {
    const zi = Math.round(z / tile);
    for (let x = xMin; x < xMax; x += tile) {
      const xi = Math.round(x / tile);
      const dark = (xi + zi) % 2 === 0;
      const q: [number, number][] = [view.project(x, 0, z), view.project(x + tile, 0, z), view.project(x + tile, 0, z - tile), view.project(x, 0, z - tile)];
      out += poly(quad(q[0], q[1], q[2], q[3]), dark ? pal.floorA : pal.floorB, pal.ink, 0.6);
      if (density > 0.4 && !dark) {
        const m = (p: [number, number], r: [number, number]): [number, number] => [(p[0] + r[0]) / 2, (p[1] + r[1]) / 2];
        out += poly(quad(m(q[0], q[1]), m(q[1], q[2]), m(q[2], q[3]), m(q[3], q[0])), pal.primary, pal.ink, 0.5);
      }
      if (density > 0.75 && dark) {
        const zc = z - tile / 2;
        const c = view.project(x + tile / 2, 0, zc);
        const rx = (view.f / zc) * tile * 0.18;
        const ry = (rx * view.camH) / zc;
        out += `<ellipse cx="${c[0].toFixed(1)}" cy="${c[1].toFixed(1)}" rx="${rx.toFixed(1)}" ry="${ry.toFixed(1)}" fill="${pal.accent}" stroke="${pal.ink}" stroke-width="0.5"/>`;
      }
    }
  }
  return out;
}

export function drawPlatform(view: View, scene: Scene, pal: Palette): string {
  const { halfWidth, z, steps, stepHeight } = scene.platform;
  const F = facade(view, z);
  let out = "";
  for (let i = 0; i < steps; i++) {
    const hw = halfWidth + (steps - 1 - i) * 0.6;
    const y0 = i * stepHeight;
    out += rect(F.X(-hw), F.Y(y0 + stepHeight), F.s * hw * 2, F.s * stepHeight, i % 2 === 0 ? pal.secondary : pal.gold, pal.ink);
  }
  return out;
}

export function drawColumn(view: View, col: Column, pal: Palette, density: number, complexity: number): string {
  const F = facade(view, col.z);
  const { x, h, r } = col;
  const baseY = 0.66;
  let out = "";
  out += rect(F.X(x - r * 1.8), F.Y(baseY + 0.14), F.s * r * 3.6, F.s * 0.14, pal.gold, pal.ink);
  out += rect(F.X(x - r * 1.4), F.Y(baseY + 0.28), F.s * r * 2.8, F.s * 0.14, pal.secondary, pal.ink);
  const shaftY0 = baseY + 0.28;
  const shaftY1 = h - 0.32;
  out += rect(F.X(x - r), F.Y(shaftY1), F.s * r * 2, F.s * (shaftY1 - shaftY0), pal.primary, pal.ink);
  if (density > 0.5) {
    const bands = complexity * 2;
    const bh = (shaftY1 - shaftY0) / bands;
    for (let i = 0; i < bands; i += 2) {
      out += rect(F.X(x - r), F.Y(shaftY0 + (i + 1) * bh), F.s * r * 2, F.s * bh, pal.accent, pal.ink, 0.6);
    }
  }
  const flutes = 1 + Math.round(density * 5);
  for (let i = 1; i <= flutes; i++) {
    const fx = F.X(x - r + ((r * 2) / (flutes + 1)) * i);
    out += `<line x1="${fx.toFixed(1)}" y1="${F.Y(shaftY0).toFixed(1)}" x2="${fx.toFixed(1)}" y2="${F.Y(shaftY1).toFixed(1)}" stroke="${pal.ink}" stroke-width="0.8" opacity="0.6"/>`;
  }
  out += rect(F.X(x - r * 1.5), F.Y(h), F.s * r * 3, F.s * 0.32, pal.secondary, pal.ink);
  const volR = F.s * r * 0.55;
  const volY = F.Y(h - 0.1);
  for (const side of [-1, 1]) {
    const vx = F.X(x + side * r * 1.1);
    out += `<polyline points="${logSpiralPoints(vx, volY, volR * 0.12, 0.28, 1.6, 48, side < 0, Math.PI)}" fill="none" stroke="${pal.ink}" stroke-width="1.4"/>`;
  }
  return out;
}

function arcPath(cx: number, cy: number, r: number): string {
  return `M ${pt(cx - r, cy)} A ${r.toFixed(1)} ${r.toFixed(1)} 0 0 1 ${pt(cx + r, cy)}`;
}

export function drawArch(view: View, arch: Arch, pal: Palette, complexity: number): string {
  const F = facade(view, arch.z);
  const cx = F.X((arch.x0 + arch.x1) / 2);
  const cy = F.Y(arch.y);
  const R = F.s * arch.r;
  const rIn = R * 0.78;
  let out = "";
  out += `<path d="${arcPath(cx, cy, rIn)} L ${pt(cx + rIn, F.Y(0.66))} L ${pt(cx - rIn, F.Y(0.66))} Z" fill="${pal.void}" stroke="none"/>`;
  const n = 7 + 2 * complexity;
  for (let i = 0; i < n; i++) {
    const a0 = Math.PI + (i * Math.PI) / n;
    const a1 = Math.PI + ((i + 1) * Math.PI) / n;
    const p = [
      pt(cx + rIn * Math.cos(a0), cy + rIn * Math.sin(a0)),
      pt(cx + R * Math.cos(a0), cy + R * Math.sin(a0)),
      pt(cx + R * Math.cos(a1), cy + R * Math.sin(a1)),
      pt(cx + rIn * Math.cos(a1), cy + rIn * Math.sin(a1)),
    ].join(" ");
    const key = i === Math.floor(n / 2);
    out += poly(p, key ? pal.gold : i % 2 === 0 ? pal.primary : pal.secondary, pal.ink, 0.9);
  }
  for (let k = 1; k <= arch.nested; k++) {
    const rk = rIn * (1 - 0.14 * k);
    out += `<path d="${arcPath(cx, cy, rk)}" fill="none" stroke="${k % 2 ? pal.accent : pal.secondary}" stroke-width="${(2.2 - k * 0.4).toFixed(1)}"/>`;
  }
  return out;
}

export function drawEntablature(view: View, scene: Scene, pal: Palette): string {
  const { halfWidth, z, y, h, triglyphs } = scene.entablature;
  const F = facade(view, z);
  let out = rect(F.X(-halfWidth), F.Y(y + h), F.s * halfWidth * 2, F.s * h, pal.gold, pal.ink);
  const pitch = (halfWidth * 2) / triglyphs;
  for (let i = 0; i < triglyphs; i++) {
    const gx = -halfWidth + i * pitch + pitch * 0.25;
    out += rect(F.X(gx), F.Y(y + h * 0.8), F.s * pitch * 0.5, F.s * h * 0.6, i % 2 === 0 ? pal.ink : pal.secondary, pal.ink, 0.6);
  }
  out += rect(F.X(-halfWidth - 0.3), F.Y(y + h + 0.16), F.s * (halfWidth + 0.3) * 2, F.s * 0.16, pal.primary, pal.ink);
  return out;
}

function domeTier(cx: number, baseY: number, R: number, ribs: number, pal: Palette, density: number): string {
  let out = `<path d="${arcPath(cx, baseY, R)} Z" fill="${pal.primary}" stroke="${pal.ink}" stroke-width="1.4"/>`;
  out += radialLines(cx, baseY, R, ribs + 1, pal.ink, 1.1, "", Math.PI, Math.PI);
  for (let k = 1; k <= 2; k++) {
    const rk = R * (1 - 0.3 * k);
    out += `<path d="${arcPath(cx, baseY, rk)}" fill="none" stroke="${k === 1 ? pal.accent : pal.secondary}" stroke-width="1.2"/>`;
  }
  if (density > 0.5) {
    for (let i = 0; i <= ribs; i++) {
      const a = Math.PI + (i * Math.PI) / ribs;
      out += `<circle cx="${(cx + R * Math.cos(a)).toFixed(1)}" cy="${(baseY + R * Math.sin(a)).toFixed(1)}" r="${(R * 0.05).toFixed(1)}" fill="${pal.gold}" stroke="${pal.ink}" stroke-width="0.8"/>`;
    }
  }
  return out;
}

export function drawDome(view: View, dome: Dome, pal: Palette, density: number): string {
  const F = facade(view, dome.z);
  const cx = F.X(dome.x);
  let out = "";
  let R = F.s * dome.r;
  let baseY = F.Y(dome.y);
  const drumH = R * 0.32;
  out += rect(cx - R, baseY - drumH, R * 2, drumH, pal.secondary, pal.ink);
  const windows = Math.max(3, Math.round(dome.ribs / 2));
  for (let i = 0; i < windows; i++) {
    const wx = cx - R + ((2 * R) / windows) * (i + 0.5);
    const wr = (R / windows) * 0.32;
    out += `<path d="${arcPath(wx, baseY - drumH * 0.35, wr)} L ${pt(wx + wr, baseY - drumH * 0.08)} L ${pt(wx - wr, baseY - drumH * 0.08)} Z" fill="${pal.void}" stroke="${pal.ink}" stroke-width="0.8"/>`;
  }
  baseY -= drumH;
  for (let t = 0; t < dome.tiers; t++) {
    out += domeTier(cx, baseY, R, dome.ribs, pal, density);
    const lanternH = R * 0.22;
    out += rect(cx - R * 0.18, baseY - R - lanternH, R * 0.36, lanternH, pal.gold, pal.ink);
    baseY = baseY - R - lanternH;
    R *= 0.42;
  }
  out += `<line x1="${cx.toFixed(1)}" y1="${baseY.toFixed(1)}" x2="${cx.toFixed(1)}" y2="${(baseY - R * 1.6).toFixed(1)}" stroke="${pal.ink}" stroke-width="1.6"/>`;
  out += `<polygon points="${starPoints(cx, baseY - R * 1.9, R * 0.5, R * 0.2, 5)}" fill="${pal.accent}" stroke="${pal.ink}" stroke-width="1"/>`;
  return out;
}

export function drawSun(cfg: FriedebergConfig, scene: Scene, pal: Palette): string {
  const cx = cfg.width * scene.sun.u;
  const cy = cfg.height * scene.sun.v;
  const R = cfg.height * 0.075;
  let out = "";
  for (let i = 0; i < scene.sun.rays; i++) {
    const a = (i * 2 * Math.PI) / scene.sun.rays;
    const len = i % 2 === 0 ? R * 2.1 : R * 1.5;
    const w = Math.PI / scene.sun.rays / 2.2;
    const p = [pt(cx + R * Math.cos(a - w), cy + R * Math.sin(a - w)), pt(cx + len * Math.cos(a), cy + len * Math.sin(a)), pt(cx + R * Math.cos(a + w), cy + R * Math.sin(a + w))].join(" ");
    out += poly(p, i % 2 === 0 ? pal.accent : pal.primary, pal.ink, 0.9);
  }
  out += `<circle cx="${cx}" cy="${cy}" r="${R.toFixed(1)}" fill="${pal.gold}" stroke="${pal.ink}" stroke-width="1.6"/>`;
  out += concentricCircles(cx, cy, R * 0.8, 3, pal.ink, 1, "");
  out += `<polygon points="${regularPoints(cx, cy, R * 0.45, 3)}" fill="${pal.secondary}" stroke="${pal.ink}" stroke-width="1"/>`;
  return out;
}

export function drawStars(cfg: FriedebergConfig, scene: Scene, view: View, pal: Palette, rng: Rng): string {
  const cx = cfg.width * scene.sun.u;
  const cy = cfg.height * scene.sun.v;
  const golden = Math.PI * (3 - Math.sqrt(5));
  const minR = cfg.height * 0.075 * 2.6;
  const spread = cfg.height * 0.052;
  let out = "";
  for (let k = 1; k <= scene.stars; k++) {
    const r = minR + spread * Math.sqrt(k);
    const a = k * golden;
    const x = cx + r * Math.cos(a);
    const y = cy + r * Math.sin(a);
    if (y > view.hy - 30 || y < 30 || x < 30 || x > cfg.width - 30) continue;
    const size = 4 + rng() * 6;
    out += `<polygon points="${starPoints(x, y, size, size * 0.38, 4, a)}" fill="${k % 3 === 0 ? pal.primary : pal.accent}" stroke="${pal.ink}" stroke-width="0.7"/>`;
  }
  return out;
}

export function drawFrame(cfg: FriedebergConfig, pal: Palette, complexity: number): string {
  const t = 22;
  const colors = [pal.primary, pal.secondary, pal.accent];
  let out = "";
  const nx = Math.ceil(cfg.width / t);
  const ny = Math.ceil(cfg.height / t);
  for (let i = 0; i < nx; i++) {
    out += rect(i * t, 0, t, t, colors[i % 3], pal.ink, 0.8);
    out += rect(i * t, cfg.height - t, t, t, colors[(i + 1) % 3], pal.ink, 0.8);
  }
  for (let j = 1; j < ny - 1; j++) {
    out += rect(0, j * t, t, t, colors[(j + 2) % 3], pal.ink, 0.8);
    out += rect(cfg.width - t, j * t, t, t, colors[j % 3], pal.ink, 0.8);
  }
  if (complexity >= 4) {
    for (const [x, y] of [[t * 2, t * 2], [cfg.width - t * 2, t * 2], [t * 2, cfg.height - t * 2], [cfg.width - t * 2, cfg.height - t * 2]]) {
      out += `<polygon points="${starPoints(x, y, t * 1.6, t * 0.7, 8)}" fill="${pal.gold}" stroke="${pal.ink}" stroke-width="1"/>`;
    }
  }
  return out;
}

export function renderFriedeberg(partial: Partial<FriedebergConfig> = {}): { svg: string; scene: Scene } {
  const cfg: FriedebergConfig = { ...DEFAULT_CONFIG, ...partial };
  const rng = mulberry32(cfg.seed);
  const pal = cfg.palette;
  const scene = buildScene(cfg, rng);
  const view = makeView(cfg);
  const layers = [
    `<rect width="${cfg.width}" height="${cfg.height}" fill="${pal.bg}"/>`,
    drawSun(cfg, scene, pal),
    drawStars(cfg, scene, view, pal, rng),
    `<rect x="0" y="${view.hy.toFixed(1)}" width="${cfg.width}" height="2" fill="${pal.ink}"/>`,
    drawPattern(view, scene, pal, cfg.density),
    drawPlatform(view, scene, pal),
    drawDome(view, scene.dome, pal, cfg.density),
    scene.arches.map((a) => drawArch(view, a, pal, cfg.complexity)).join(""),
    scene.columns.map((c) => drawColumn(view, c, pal, cfg.density, cfg.complexity)).join(""),
    drawEntablature(view, scene, pal),
    drawFrame(cfg, pal, cfg.complexity),
  ];
  const svg = `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 ${cfg.width} ${cfg.height}" width="${cfg.width}" height="${cfg.height}">\n${layers.join("\n")}\n</svg>`;
  return { svg, scene };
}
