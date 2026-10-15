import { arcPath, chevronBand, dotRow, fan, greca, helixBand, nestedArches, pointedRingPath, rosette, sierpinski, visible, volutePair, voussoirs, type Ink } from "./ornamentMotifs.ts";
import { concentricCircles, mulberry32, pt, radialLines, starPoints, type Rng } from "./svgPrimitives.ts";

export type Palette = {
  bg: string;
  wall: string;
  ink: string;
  primary: string;
  secondary: string;
  accent: string;
  gold: string;
  floorA: string;
  floorB: string;
  deep: string;
};

export const PALETTES: Record<string, Palette> = {
  friedeberg: {
    bg: "#f3e7c6",
    wall: "#e6d5ab",
    ink: "#1a1412",
    primary: "#b8336a",
    secondary: "#2f8f86",
    accent: "#dfa23d",
    gold: "#c89a2a",
    floorA: "#1a1412",
    floorB: "#f3e7c6",
    deep: "#2a2f6b",
  },
  noche: {
    bg: "#0b0b12",
    wall: "#16162a",
    ink: "#f1e6c8",
    primary: "#d8468f",
    secondary: "#2fb7c9",
    accent: "#e6bf55",
    gold: "#e0b24a",
    floorA: "#0b0b12",
    floorB: "#33ff99",
    deep: "#000000",
  },
};

export type FriedebergConfig = {
  seed: number;
  width: number;
  height: number;
  palette: Palette;
  density: number;
  complexity: number;
  anomalyRate: number;
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
  anomalyRate: 0.5,
  horizon: 0.55,
  focal: 0.7,
  camHeight: 1.7,
};

export type Column = { x: number; z: number; h: number; r: number; twisted: boolean };
export type Arch = { x0: number; x1: number; z: number; y: number; r: number; pointed: boolean; gallery: number[] };
export type Window = { x: number; z: number; y: number; r: number; star: boolean };
export type Colonnade = {
  z: number;
  depth: number;
  floorY: number;
  halfWidth: number;
  columns: Column[];
  arches: Arch[];
  windows: Window[];
  entablature: { y: number; h: number; triglyphs: number; flipped: number };
  dome: { x: number; y: number; r: number; ribs: number; tiers: number } | null;
};
export type Scene = {
  floor: { tile: number; xMin: number; xMax: number; zMin: number; zMax: number };
  platform: { halfWidth: number; z: number; depth: number; steps: number; stepHeight: number };
  main: Colonnade;
  wings: Colonnade[];
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

function buildColonnade(cfg: FriedebergConfig, rng: Rng, xCenter: number, nCols: number, spacing: number, z: number, h: number, floorY: number, withDome: boolean): Colonnade {
  const r = spacing * 0.125;
  const half = ((nCols - 1) / 2) * spacing;
  const anomaly = () => rng() < cfg.anomalyRate;
  const twistedAt = anomaly() ? Math.floor(rng() * nCols) : -1;
  const pointedAt = anomaly() ? Math.floor(rng() * (nCols - 1)) : -1;
  const columns: Column[] = [];
  for (let i = 0; i < nCols; i++) columns.push({ x: xCenter - half + i * spacing, z, h, r, twisted: i === twistedAt });
  const archR = spacing / 2 - r;
  const galleryDepths = Array.from({ length: Math.min(cfg.complexity, 4) }, (_, k) => (k + 1) * spacing * 1.1);
  const arches: Arch[] = [];
  for (let i = 0; i < nCols - 1; i++) {
    arches.push({ x0: columns[i].x + r, x1: columns[i + 1].x - r, z, y: h, r: archR, pointed: i === pointedAt, gallery: galleryDepths });
  }
  const crown = h + archR;
  const winR = spacing * 0.16;
  const windows: Window[] = [];
  const nWin = nCols * 2 - 1;
  const starAt = anomaly() ? Math.floor(rng() * nWin) : -1;
  for (let i = 0; i < nWin; i++) windows.push({ x: xCenter - half + (i + 0.5) * ((half * 2) / nWin), z, y: crown + 0.35, r: winR, star: i === starAt });
  const entY = crown + 0.35 + winR * 2 + 0.3;
  const entH = spacing * 0.28;
  const flipped = anomaly() ? Math.floor(rng() * (nCols * 2 + 1)) : -1;
  return {
    z,
    depth: spacing * 0.6,
    floorY,
    halfWidth: half + spacing * 0.42,
    columns,
    arches,
    windows,
    entablature: { y: entY, h: entH, triglyphs: nCols * 2 + 1, flipped },
    dome: withDome ? { x: xCenter, y: entY + entH, r: spacing * 0.8, ribs: [8, 12, 16][Math.floor(rng() * 3)], tiers: Math.min(cfg.complexity, 2) } : null,
  };
}

export function buildScene(cfg: FriedebergConfig, rng: Rng): Scene {
  const nCols = cfg.columns ?? [5, 7, 9][Math.floor(rng() * 3)];
  const spacing = 2.4;
  const z = 20;
  const h = 4.2 + rng() * 1.2;
  const steps = 3;
  const stepHeight = 0.22;
  const floorY = steps * stepHeight;
  const main = buildColonnade(cfg, rng, 0, nCols, spacing, z, h, floorY, true);
  const wingOffset = main.halfWidth + spacing * 2.6;
  const wings = [-1, 1].map((side) => buildColonnade(cfg, rng, side * wingOffset, 3, spacing * 0.8, z + 7, h * 0.78, 0, true));
  return {
    floor: { tile: 1.25, xMin: -16, xMax: 16, zMin: 2.4, zMax: 46 },
    platform: { halfWidth: main.halfWidth + 1.2, z: z - 1.4, depth: 2.8, steps, stepHeight },
    main,
    wings,
    sun: { u: 0.5, v: 0.13, rays: 12 + 4 * cfg.complexity },
    stars: Math.round(24 + 72 * cfg.density),
  };
}

type Facade = { X: (x: number) => number; Y: (y: number) => number; s: number; sw: number };

function facade(view: View, z: number): Facade {
  const s = view.f / z;
  return { X: (x) => view.cx + x * s, Y: (y) => view.hy + (view.camH - y) * s, s, sw: Math.max(0.4, Math.min(1.4, s / 40)) };
}

function rect(x: number, y: number, w: number, h: number, fill: string, stroke: string, sw = 1): string {
  return `<rect x="${x.toFixed(1)}" y="${y.toFixed(1)}" width="${w.toFixed(1)}" height="${h.toFixed(1)}" fill="${fill}" stroke="${stroke}" stroke-width="${sw}"/>`;
}

function poly(points: string, fill: string, stroke: string, sw = 1, extra = ""): string {
  return `<polygon points="${points}" fill="${fill}" stroke="${stroke}" stroke-width="${sw}" stroke-linejoin="round"${extra}/>`;
}

function quad(a: [number, number], b: [number, number], c: [number, number], d: [number, number]): string {
  return `${pt(...a)} ${pt(...b)} ${pt(...c)} ${pt(...d)}`;
}

function inks(pal: Palette, a: string, b: string, c: string): Ink {
  return { ink: pal.ink, a, b, c };
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
      const px = q[1][0] - q[0][0];
      if (density > 0.4 && !dark && visible(px, 8)) {
        const m = (p: [number, number], r: [number, number]): [number, number] => [(p[0] + r[0]) / 2, (p[1] + r[1]) / 2];
        out += poly(quad(m(q[0], q[1]), m(q[1], q[2]), m(q[2], q[3]), m(q[3], q[0])), pal.primary, pal.ink, 0.5);
      }
      if (density > 0.75 && dark && visible(px, 14)) {
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
  const { halfWidth, z, depth, steps, stepHeight } = scene.platform;
  let out = "";
  for (let i = 0; i < steps; i++) {
    const hw = halfWidth + (steps - 1 - i) * 0.6;
    const d = depth + (steps - 1 - i) * 0.6;
    const y0 = i * stepHeight;
    const y1 = y0 + stepHeight;
    const top = quad(view.project(-hw, y1, z + d), view.project(hw, y1, z + d), view.project(hw, y1, z), view.project(-hw, y1, z));
    out += poly(top, i % 2 === 0 ? pal.secondary : pal.gold, pal.ink, 0.9);
    const front = quad(view.project(-hw, y1, z), view.project(hw, y1, z), view.project(hw, y0, z), view.project(-hw, y0, z));
    out += poly(front, i % 2 === 0 ? pal.gold : pal.secondary, pal.ink, 0.9);
    const F = facade(view, z);
    const cells = Math.round(hw * 2 / 0.6);
    if (visible(F.s * stepHeight, 10)) out += greca(F.X(-hw), F.Y(y1) + 1, F.s * hw * 2, F.s * stepHeight - 2, cells, inks(pal, pal.gold, i % 2 === 0 ? pal.gold : pal.secondary, pal.accent), 0.5);
  }
  return out;
}

export function drawColumn(view: View, col: Column, floorY: number, pal: Palette, density: number, complexity: number): string {
  const F = facade(view, col.z);
  const { x, h, r } = col;
  const sw = F.sw;
  let out = "";
  const baseH = 0.14;
  out += rect(F.X(x - r * 1.8), F.Y(floorY + baseH), F.s * r * 3.6, F.s * baseH, pal.gold, pal.ink, sw);
  if (visible(F.s * baseH, 8)) out += greca(F.X(x - r * 1.8), F.Y(floorY + baseH) + 1, F.s * r * 3.6, F.s * baseH - 2, 4, inks(pal, pal.gold, pal.gold, pal.accent), sw * 0.6);
  out += rect(F.X(x - r * 1.4), F.Y(floorY + baseH * 2), F.s * r * 2.8, F.s * baseH, pal.secondary, pal.ink, sw);
  const shaftY0 = floorY + baseH * 2;
  const shaftY1 = h - 0.32;
  const sx = F.X(x - r);
  const sw2 = F.s * r * 2;
  const sy = F.Y(shaftY1);
  const sh = F.s * (shaftY1 - shaftY0);
  if (col.twisted) {
    out += helixBand(sx, sy, sw2, sh, 2 + complexity, inks(pal, pal.secondary, pal.primary, pal.accent), sw);
  } else {
    const bands = 2 + complexity * 2;
    const bh = sh / bands;
    for (let i = 0; i < bands; i++) {
      const y = sy + i * bh;
      if (i % 2 === 0) {
        out += rect(sx, y, sw2, bh, pal.primary, pal.ink, sw * 0.8);
        const flutes = 1 + Math.round(density * 4);
        for (let k = 1; k <= flutes; k++) {
          const fx = sx + (sw2 / (flutes + 1)) * k;
          out += `<line x1="${fx.toFixed(1)}" y1="${y.toFixed(1)}" x2="${fx.toFixed(1)}" y2="${(y + bh).toFixed(1)}" stroke="${pal.ink}" stroke-width="${(sw * 0.7).toFixed(2)}" opacity="0.6"/>`;
        }
      } else if (visible(bh, 7)) {
        out += chevronBand(sx, y, sw2, bh, 3, inks(pal, pal.accent, pal.secondary, pal.primary), sw * 0.6, density > 0.6 && visible(bh, 14));
      } else {
        out += rect(sx, y, sw2, bh, pal.accent, pal.ink, sw * 0.8);
      }
    }
  }
  const capY = F.Y(h);
  const capH = F.s * 0.32;
  out += rect(F.X(x - r * 1.5), capY, F.s * r * 3, capH, pal.secondary, pal.ink, sw);
  if (visible(capH, 9)) out += dotRow(F.X(x - r * 1.5), capY + capH * 0.8, F.s * r * 3, 5, capH * 0.08, pal.ink);
  out += volutePair(F.X(x), F.Y(h - 0.1), F.s * r * 0.55, inks(pal, pal.secondary, pal.primary, pal.accent), sw, complexity >= 3 ? 2 : 1);
  if (complexity >= 3 && visible(capH, 10)) out += rosette(F.X(x), capY + capH * 0.42, capH * 0.3, 6, inks(pal, pal.accent, pal.primary, pal.gold), sw * 0.6, 2);
  return out;
}

function galleryFloorLines(view: View, x0: number, x1: number, z0: number, z1: number, y: number, pal: Palette, sw: number): string {
  let out = "";
  const n = 4;
  for (let k = 1; k <= n; k++) {
    const z = z0 + ((z1 - z0) * k) / n;
    const a = view.project(x0, y, z);
    const b = view.project(x1, y, z);
    out += `<line x1="${a[0].toFixed(1)}" y1="${a[1].toFixed(1)}" x2="${b[0].toFixed(1)}" y2="${b[1].toFixed(1)}" stroke="${pal.ink}" stroke-width="${sw.toFixed(2)}" opacity="0.7"/>`;
  }
  return out;
}

export function drawOpening(view: View, arch: Arch, floorY: number, pal: Palette, complexity: number): string {
  const cx = (arch.x0 + arch.x1) / 2;
  const levels = [0, ...arch.gallery];
  let out = "";
  for (let k = 0; k < levels.length; k++) {
    const z0 = arch.z + levels[k];
    const F0 = facade(view, z0);
    const last = k === levels.length - 1;
    const inner = F0.s * arch.r * 0.78;
    const ccx = F0.X(cx);
    const ccy = F0.Y(arch.y);
    if (last) {
      out += `<path d="${arcPath(ccx, ccy, inner, arch.pointed)} L ${pt(ccx + inner, F0.Y(floorY))} L ${pt(ccx - inner, F0.Y(floorY))} Z" fill="${pal.deep}" stroke="${pal.ink}" stroke-width="${F0.sw}"/>`;
      const rr = inner * 0.5;
      if (visible(rr, 6)) {
        out += fan(ccx, ccy - inner * 0.1, rr, 12, Math.PI, Math.PI, inks(pal, pal.primary, pal.accent, pal.gold), F0.sw * 0.6);
        out += rosette(ccx, ccy - inner * 0.1, rr * 0.5, 8, inks(pal, pal.accent, pal.secondary, pal.gold), F0.sw * 0.7, 2);
      }
      break;
    }
    const z1 = arch.z + levels[k + 1];
    const F1 = facade(view, z1);
    const inner1 = F1.s * arch.r * 0.78;
    const icx = F1.X(cx);
    const icy = F1.Y(arch.y);
    const fy0 = F0.Y(floorY);
    const fy1 = F1.Y(floorY);
    out += `<path d="${arcPath(ccx, ccy, inner, arch.pointed)} L ${pt(ccx + inner, fy0)} L ${pt(ccx - inner, fy0)} Z" fill="${pal.wall}" stroke="none"/>`;
    out += poly(quad([ccx - inner, ccy], [icx - inner1, icy], [icx - inner1, fy1], [ccx - inner, fy0]), pal.wall, pal.ink, F0.sw * 0.8);
    out += poly(quad([ccx + inner, ccy], [icx + inner1, icy], [icx + inner1, fy1], [ccx + inner, fy0]), pal.wall, pal.ink, F0.sw * 0.8);
    out += poly(quad([ccx - inner, fy0], [icx - inner1, fy1], [icx + inner1, fy1], [ccx + inner, fy0]), pal.floorB, pal.ink, F0.sw * 0.6);
    out += galleryFloorLines(view, cx - arch.r * 0.78, cx + arch.r * 0.78, z0, z1, floorY, pal, F0.sw * 0.6);
    const ribs = 6 + complexity * 2;
    for (let i = 0; i <= ribs; i++) {
      const a = Math.PI + (i * Math.PI) / ribs;
      const ax = ccx + inner * Math.cos(a);
      const ay = ccy + inner * Math.sin(a);
      const bx = icx + inner1 * Math.cos(a);
      const by = icy + inner1 * Math.sin(a);
      out += `<line x1="${ax.toFixed(1)}" y1="${ay.toFixed(1)}" x2="${bx.toFixed(1)}" y2="${by.toFixed(1)}" stroke="${pal.ink}" stroke-width="${(F0.sw * 0.7).toFixed(2)}" opacity="0.8"/>`;
    }
    if (visible((fy0 - ccy) * 0.2, 6)) {
      const wy = (ccy + fy0) / 2;
      const wy1 = (icy + fy1) / 2;
      const steps = 3;
      for (let i = 1; i <= steps; i++) {
        const t = i / (steps + 1);
        const wx = ccx - inner + (icx - inner1 - (ccx - inner)) * t;
        const wyy = wy + (wy1 - wy) * t;
        const wr = (inner - (inner - inner1) * t) * 0.14;
        out += `<path d="${arcPath(wx, wyy - wr, wr)} L ${pt(wx + wr, wyy + wr)} L ${pt(wx - wr, wyy + wr)} Z" fill="${pal.deep}" stroke="${pal.ink}" stroke-width="${(F0.sw * 0.6).toFixed(2)}"/>`;
        const wx2 = ccx + inner - (ccx + inner - (icx + inner1)) * t;
        out += `<path d="${arcPath(wx2, wyy - wr, wr)} L ${pt(wx2 + wr, wyy + wr)} L ${pt(wx2 - wr, wyy + wr)} Z" fill="${pal.deep}" stroke="${pal.ink}" stroke-width="${(F0.sw * 0.6).toFixed(2)}"/>`;
      }
    }
    out += `<rect x="${(icx - inner1).toFixed(1)}" y="${icy.toFixed(1)}" width="${(inner1 * 2).toFixed(1)}" height="${(fy1 - icy).toFixed(1)}" fill="${pal.wall}" stroke="none"/>`;
    out += voussoirs(icx, icy, inner1, inner1 / 0.78 * 0.92, 5 + complexity, inks(pal, pal.secondary, pal.wall, pal.accent), F1.sw * 0.7, 1);
  }
  return out;
}

export function drawArch(view: View, arch: Arch, pal: Palette, complexity: number): string {
  const F = facade(view, arch.z);
  const cx = F.X((arch.x0 + arch.x1) / 2);
  const cy = F.Y(arch.y);
  const R = F.s * arch.r;
  const rIn = R * 0.78;
  const ink = inks(pal, pal.primary, pal.secondary, pal.gold);
  if (arch.pointed) {
    let out = `<path d="${pointedRingPath(cx, cy, R, rIn)}" fill="${pal.accent}" stroke="${pal.ink}" stroke-width="${(F.sw * 1.4).toFixed(2)}"/>`;
    out += nestedArches(cx, cy, R, 3 + complexity, inks(pal, pal.primary, pal.secondary, pal.accent), F.sw * 1.6, true);
    return out;
  }
  let out = voussoirs(cx, cy, rIn, R, 7 + 2 * complexity, ink, F.sw, complexity >= 3 ? 3 : 2);
  out += nestedArches(cx, cy, rIn, Math.max(0, complexity - 2), inks(pal, pal.primary, pal.secondary, pal.accent), F.sw * 1.2);
  return out;
}

export function drawSpandrelWall(view: View, col: Colonnade, pal: Palette, complexity: number): string {
  const F = facade(view, col.z);
  const { halfWidth, entablature } = col;
  const xc = (col.columns[0].x + col.columns[col.columns.length - 1].x) / 2;
  let out = rect(F.X(xc - halfWidth), F.Y(entablature.y), F.s * halfWidth * 2, F.s * (entablature.y - col.floorY), pal.wall, pal.ink, F.sw);
  const rays = 4 + complexity;
  for (const a of col.arches) {
    const r = F.s * a.r * 0.5;
    if (!visible(r, 8)) continue;
    out += fan(F.X(a.x0), F.Y(a.y), r, rays, -Math.PI / 2, Math.PI / 2, inks(pal, pal.accent, pal.wall, pal.gold), F.sw * 0.6);
    out += fan(F.X(a.x1), F.Y(a.y), r, rays, Math.PI, Math.PI / 2, inks(pal, pal.accent, pal.wall, pal.gold), F.sw * 0.6);
  }
  for (const w of col.windows) {
    const wx = F.X(w.x);
    const wr = F.s * w.r;
    const wy = F.Y(w.y + w.r);
    if (w.star) {
      out += `<polygon points="${starPoints(wx, wy, wr * 1.3, wr * 0.55, 8)}" fill="${pal.deep}" stroke="${pal.ink}" stroke-width="${F.sw}"/>`;
      out += `<circle cx="${wx.toFixed(1)}" cy="${wy.toFixed(1)}" r="${(wr * 0.4).toFixed(1)}" fill="${pal.accent}" stroke="${pal.ink}" stroke-width="${F.sw}"/>`;
      continue;
    }
    out += `<path d="${arcPath(wx, wy, wr)} L ${pt(wx + wr, F.Y(w.y - w.r * 0.2))} L ${pt(wx - wr, F.Y(w.y - w.r * 0.2))} Z" fill="${pal.deep}" stroke="${pal.ink}" stroke-width="${F.sw}"/>`;
    if (visible(wr, 7)) out += voussoirs(wx, wy, wr, wr * 1.35, 5, inks(pal, pal.primary, pal.secondary, pal.gold), F.sw * 0.6, 1);
    if (complexity >= 4 && visible(wr, 10)) out += `<line x1="${wx.toFixed(1)}" y1="${wy.toFixed(1)}" x2="${wx.toFixed(1)}" y2="${F.Y(w.y - w.r * 0.2).toFixed(1)}" stroke="${pal.ink}" stroke-width="${F.sw}"/>`;
  }
  return out;
}

export function drawEntablature(view: View, col: Colonnade, pal: Palette, complexity: number): string {
  const { halfWidth, entablature: e, z, depth } = col;
  const xc = (col.columns[0].x + col.columns[col.columns.length - 1].x) / 2;
  const F = facade(view, z);
  let out = "";
  const soffit = quad(view.project(xc - halfWidth, e.y, z), view.project(xc + halfWidth, e.y, z), view.project(xc + halfWidth, e.y, z + depth), view.project(xc - halfWidth, e.y, z + depth));
  out += poly(soffit, pal.secondary, pal.ink, F.sw);
  const coffers = e.triglyphs;
  for (let i = 0; i < coffers; i++) {
    const x0 = xc - halfWidth + ((halfWidth * 2) / coffers) * (i + 0.2);
    const x1 = xc - halfWidth + ((halfWidth * 2) / coffers) * (i + 0.8);
    const q = quad(view.project(x0, e.y, z + depth * 0.2), view.project(x1, e.y, z + depth * 0.2), view.project(x1, e.y, z + depth * 0.8), view.project(x0, e.y, z + depth * 0.8));
    out += poly(q, i % 2 ? pal.gold : pal.deep, pal.ink, F.sw * 0.6);
  }
  if (xc !== 0) {
    const sideX = xc > 0 ? xc - halfWidth : xc + halfWidth;
    const side = quad(view.project(sideX, e.y + e.h, z), view.project(sideX, e.y + e.h, z + depth), view.project(sideX, e.y, z + depth), view.project(sideX, e.y, z));
    out += poly(side, pal.primary, pal.ink, F.sw);
  }
  out += rect(F.X(xc - halfWidth), F.Y(e.y + e.h), F.s * halfWidth * 2, F.s * e.h, pal.gold, pal.ink, F.sw);
  const pitch = (halfWidth * 2) / e.triglyphs;
  for (let i = 0; i < e.triglyphs; i++) {
    const gx = xc - halfWidth + i * pitch + pitch * 0.25;
    const even = (i % 2 === 0) !== (i === e.flipped);
    const gw = F.s * pitch * 0.5;
    const gh = F.s * e.h * 0.6;
    const gy = F.Y(e.y + e.h * 0.8);
    if (even) {
      out += rect(F.X(gx), gy, gw, gh, pal.ink, pal.ink, F.sw * 0.6);
      if (visible(gh, 8)) for (let k = 1; k <= 2; k++) out += `<line x1="${(F.X(gx) + (gw / 3) * k).toFixed(1)}" y1="${gy.toFixed(1)}" x2="${(F.X(gx) + (gw / 3) * k).toFixed(1)}" y2="${(gy + gh).toFixed(1)}" stroke="${pal.gold}" stroke-width="${F.sw.toFixed(2)}"/>`;
    } else if (visible(gh, 8)) {
      out += rosette(F.X(gx) + gw / 2, gy + gh / 2, gh * 0.45, 8, inks(pal, pal.secondary, pal.primary, pal.accent), F.sw * 0.6, complexity >= 3 ? 2 : 1);
    } else {
      out += rect(F.X(gx), gy, gw, gh, pal.secondary, pal.ink, F.sw * 0.6);
    }
  }
  const corniceH = 0.16;
  out += rect(F.X(xc - halfWidth - 0.3), F.Y(e.y + e.h + corniceH), F.s * (halfWidth + 0.3) * 2, F.s * corniceH, pal.primary, pal.ink, F.sw);
  if (visible(F.s * corniceH, 9)) out += greca(F.X(xc - halfWidth - 0.3), F.Y(e.y + e.h + corniceH) + 1, F.s * (halfWidth + 0.3) * 2, F.s * corniceH - 2, e.triglyphs * 2, inks(pal, pal.primary, pal.primary, pal.accent), F.sw * 0.6);
  return out;
}

function domeTier(cx: number, baseY: number, R: number, ribs: number, pal: Palette, density: number, sw: number, level: number): string {
  let out = `<path d="${arcPath(cx, baseY, R)} Z" fill="${pal.primary}" stroke="${pal.ink}" stroke-width="${(sw * 1.4).toFixed(2)}"/>`;
  out += radialLines(cx, baseY, R, ribs + 1, pal.ink, sw * 1.1, "", Math.PI, Math.PI);
  for (let k = 1; k <= 2; k++) {
    const rk = R * (1 - 0.3 * k);
    out += `<path d="${arcPath(cx, baseY, rk)}" fill="none" stroke="${k === 1 ? pal.accent : pal.secondary}" stroke-width="${(sw * 1.2).toFixed(2)}"/>`;
  }
  if (level > 1 && visible(R * 0.1, 4)) {
    for (let i = 0; i < ribs; i++) {
      const a = Math.PI + ((i + 0.5) * Math.PI) / ribs;
      const rm = R * 0.55;
      out += `<polygon points="${starPoints(cx + rm * Math.cos(a), baseY + rm * Math.sin(a), R * 0.07, R * 0.03, 4, a)}" fill="${pal.accent}" stroke="${pal.ink}" stroke-width="${(sw * 0.5).toFixed(2)}"/>`;
    }
  }
  if (density > 0.5) {
    for (let i = 0; i <= ribs; i++) {
      const a = Math.PI + (i * Math.PI) / ribs;
      out += `<circle cx="${(cx + R * Math.cos(a)).toFixed(1)}" cy="${(baseY + R * Math.sin(a)).toFixed(1)}" r="${(R * 0.05).toFixed(1)}" fill="${pal.gold}" stroke="${pal.ink}" stroke-width="${(sw * 0.8).toFixed(2)}"/>`;
    }
  }
  return out;
}

export function drawDome(view: View, col: Colonnade, pal: Palette, density: number, complexity: number): string {
  const dome = col.dome;
  if (!dome) return "";
  const F = facade(view, col.z);
  const cx = F.X(dome.x);
  let out = "";
  let R = F.s * dome.r;
  let baseY = F.Y(dome.y);
  const drumH = R * 0.32;
  out += rect(cx - R, baseY - drumH, R * 2, drumH, pal.secondary, pal.ink, F.sw);
  if (visible(drumH * 0.3, 6)) out += greca(cx - R, baseY - drumH * 0.3, R * 2, drumH * 0.3, Math.max(4, dome.ribs), inks(pal, pal.secondary, pal.secondary, pal.accent), F.sw * 0.6);
  const windows = Math.max(3, Math.round(dome.ribs / 2));
  for (let i = 0; i < windows; i++) {
    const wx = cx - R + ((2 * R) / windows) * (i + 0.5);
    const wr = (R / windows) * 0.3;
    out += `<path d="${arcPath(wx, baseY - drumH * 0.55, wr)} L ${pt(wx + wr, baseY - drumH * 0.34)} L ${pt(wx - wr, baseY - drumH * 0.34)} Z" fill="${pal.deep}" stroke="${pal.ink}" stroke-width="${(F.sw * 0.8).toFixed(2)}"/>`;
  }
  baseY -= drumH;
  for (let t = 0; t < dome.tiers; t++) {
    out += domeTier(cx, baseY, R, dome.ribs, pal, density, F.sw, complexity >= 3 ? 2 : 1);
    const lanternH = R * 0.22;
    out += rect(cx - R * 0.18, baseY - R - lanternH, R * 0.36, lanternH, pal.gold, pal.ink, F.sw);
    if (visible(lanternH, 8)) out += dotRow(cx - R * 0.18, baseY - R - lanternH / 2, R * 0.36, 3, lanternH * 0.12, pal.ink);
    baseY = baseY - R - lanternH;
    R *= 0.42;
  }
  out += `<line x1="${cx.toFixed(1)}" y1="${baseY.toFixed(1)}" x2="${cx.toFixed(1)}" y2="${(baseY - R * 1.6).toFixed(1)}" stroke="${pal.ink}" stroke-width="${(F.sw * 1.6).toFixed(2)}"/>`;
  out += `<polygon points="${starPoints(cx, baseY - R * 1.9, R * 0.5, R * 0.2, 5)}" fill="${pal.accent}" stroke="${pal.ink}" stroke-width="${F.sw}"/>`;
  return out;
}

export function drawColonnade(view: View, col: Colonnade, pal: Palette, cfg: FriedebergConfig): string {
  let out = "";
  out += drawSpandrelWall(view, col, pal, cfg.complexity);
  out += drawDome(view, col, pal, cfg.density, cfg.complexity);
  out += col.arches.map((a) => drawOpening(view, a, col.floorY, pal, cfg.complexity)).join("");
  out += col.arches.map((a) => drawArch(view, a, pal, cfg.complexity)).join("");
  out += col.columns.map((c) => drawColumn(view, c, col.floorY, pal, cfg.density, cfg.complexity)).join("");
  out += drawEntablature(view, col, pal, cfg.complexity);
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
  out += concentricCircles(cx, cy, R * 0.85, 2, pal.ink, 1, "");
  out += sierpinski(cx, cy + R * 0.1, R * 0.5, Math.min(cfg.complexity, 4), pal.secondary, pal.ink, 0.7);
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
  const ink = inks(pal, pal.primary, pal.secondary, pal.accent);
  let out = "";
  if (complexity >= 3) {
    out += greca(0, 0, cfg.width, t, Math.round(cfg.width / (t * 2)), ink, 0.9);
    out += greca(0, cfg.height - t, cfg.width, t, Math.round(cfg.width / (t * 2)), ink, 0.9);
    out += `<g transform="rotate(90 0 0) translate(0 ${-t})">${greca(0, 0, cfg.height, t, Math.round(cfg.height / (t * 2)), ink, 0.9)}</g>`;
    out += `<g transform="translate(${cfg.width} 0) rotate(90)">${greca(0, 0, cfg.height, t, Math.round(cfg.height / (t * 2)), ink, 0.9)}</g>`;
  } else {
    const colors = [pal.primary, pal.secondary, pal.accent];
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
  }
  for (const [x, y] of [[t * 2.2, t * 2.2], [cfg.width - t * 2.2, t * 2.2], [t * 2.2, cfg.height - t * 2.2], [cfg.width - t * 2.2, cfg.height - t * 2.2]]) {
    out += rosette(x, y, t * 1.7, 8, inks(pal, pal.gold, pal.primary, pal.secondary), 0.9, complexity >= 3 ? 2 : 1);
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
    scene.wings.map((w) => drawColonnade(view, w, pal, cfg)).join(""),
    drawPlatform(view, scene, pal),
    drawColonnade(view, scene.main, pal, cfg),
    drawFrame(cfg, pal, cfg.complexity),
  ];
  const svg = `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 ${cfg.width} ${cfg.height}" width="${cfg.width}" height="${cfg.height}">\n${layers.join("\n")}\n</svg>`;
  return { svg, scene };
}
