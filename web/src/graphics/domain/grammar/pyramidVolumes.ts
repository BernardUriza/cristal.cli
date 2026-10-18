import type { Solid } from "../architecture/mass.ts";
import type { Rect } from "../architecture/layout.ts";
import type { PlacedSpace } from "./layout.ts";
import { frameStrips, frustum, grow, part, withoutTop } from "./solidKit.ts";
import type { Heading } from "./types.ts";

const LIP = 0.08;

const PROFILE = {
  tablero: { talud: 0.4, flare: 0.25, cornice: 0.25, overhang: 0.3 },
  nichos: { talud: 0.3, flare: 0.2, cornice: 0.35, overhang: 0.55 },
} as const;

const MAX_FLARE = 1.8;

/** One body of a stepped pyramid: talud flaring out from the terrace edge, tablero and cornice (or a single steep talud), and the terrace floor on top. */
export function steppedBody(p: PlacedSpace): Solid[] {
  const r = p.rect;
  const h = p.y1 - p.y0;
  const top = p.y1 - LIP;
  if (p.node.style === "talud") {
    const flare = Math.min(MAX_FLARE, h * 0.45);
    return [frustum(p, "talud", "wall", grow(r, flare), r, p.y0, top), part(p, "floor", "floor", r, top, p.y1)];
  }
  const k = PROFILE[p.node.style === "nichos" ? "nichos" : "tablero"];
  const flare = Math.min(MAX_FLARE, h * k.flare);
  const knee = p.y0 + h * k.talud;
  const corniceY = Math.max(knee + 0.2, top - k.cornice);
  return [
    frustum(p, "talud", "wall", grow(r, flare), r, p.y0, knee),
    withoutTop(part(p, "tablero", "wall", grow(r, 0.12), knee, corniceY)),
    withoutTop(part(p, "cornisa", "lintel", grow(r, k.overhang), corniceY, top)),
    part(p, "floor", "floor", grow(r, k.overhang), top, p.y1),
  ];
}

function backStrip(r: Rect, heading: Heading | undefined, along: number, thick: number): Rect {
  const cx = (r.x0 + r.x1) / 2;
  const cz = (r.z0 + r.z1) / 2;
  const back = { x: heading === 0 ? -1 : heading === 180 ? 1 : 0, z: heading === 90 ? -1 : heading === 270 ? 1 : 0 };
  const sx = r.x1 - r.x0;
  const sz = r.z1 - r.z0;
  const ox = back.x * sx * 0.18;
  const oz = back.z * sz * 0.18;
  const crossX = back.x === 0;
  const hx = crossX ? (sx * along) / 2 : thick / 2;
  const hz = crossX ? thick / 2 : (sz * along) / 2;
  return { x0: cx + ox - hx, x1: cx + ox + hx, z0: cz + oz - hz, z1: cz + oz + hz };
}

/** Maya roof comb: two stepped slabs set toward the back of the temple roof, across the front axis. */
export function crest(p: PlacedSpace): Solid[] {
  const knee = p.y0 + (p.y1 - p.y0) * 0.55;
  return [
    part(p, "crest0", "wall", backStrip(p.rect, p.node.heading, 0.8, 1), p.y0, knee),
    part(p, "crest1", "wall", backStrip(p.rect, p.node.heading, 0.55, 0.7), knee, p.y1),
  ];
}

/** The flat-roofed temple on top of the pyramid: walled cella, a deep frieze cornice and the roof slab. */
export function summitTemple(p: PlacedSpace): Solid[] {
  const r = p.rect;
  return [
    part(p, "body", "wall", r, p.y0, p.y1 - 0.9),
    part(p, "cornice", "lintel", grow(r, 0.3), p.y1 - 0.9, p.y1 - 0.35),
    part(p, "roof", "roof", grow(r, 0.15), p.y1 - 0.35, p.y1),
  ];
}

const BANQUETTE = { width: 6, height: 2.6 } as const;

/** Ciudadela: the enclosure's four raised banquettes with tablero fronts, on a paved floor that holds the pyramid and its plaza. */
export function precinct(p: PlacedSpace): Solid[] {
  const top = p.y1 + BANQUETTE.height;
  return [part(p, "floor", "floor", p.rect, p.y0, p.y1), ...frameStrips(p.rect, BANQUETTE.width).map((r, i) => part(p, `tablero${i}`, "wall", r, p.y1, top))];
}

/** Calzada: a raised walk with a low parapet down each long side. */
export function causeway(p: PlacedSpace): Solid[] {
  const r = p.rect;
  const alongX = r.x1 - r.x0 >= r.z1 - r.z0;
  const k = 0.5;
  const sides: Rect[] = alongX ? [{ ...r, z1: r.z0 + k }, { ...r, z0: r.z1 - k }] : [{ ...r, x1: r.x0 + k }, { ...r, x0: r.x1 - k }];
  return [part(p, "floor", "floor", r, p.y0, p.y1), ...sides.map((s, i) => part(p, `parapet${i}`, "wall", s, p.y1, p.y1 + 0.6))];
}
