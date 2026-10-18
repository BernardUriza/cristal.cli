import type { Rng } from "../../../../../shared/rng.ts";
import { detailAt, type DetailChoice } from "../../../lod.ts";
import { filled, polygon, type Shape, type Vec2 } from "../../../shapes.ts";
import { MOTIFS } from "../index.ts";
import { boxAnchors, oval, type Part, type StructuralRole } from "../parts.ts";
import type { MotifParams } from "../types.ts";
import { toWorld, type BodyFrame } from "./frame.ts";
import { BODY_TUNING, SOCKET_ACCEPTS, SUBPART_ACCEPTS } from "./tuning.ts";
import type { PartKind, Primitive, Socket } from "./types.ts";

const UNIT: MotifParams = { size: 1, detail: 1, fill: "none", ink: "none", accent: "none" };

function stadium(w: number, h: number, n = 8): Vec2[] {
  const r = Math.min(w, h) / 2;
  const vertical = h >= w;
  const c = (vertical ? h : w) / 2 - r;
  const cap = (sign: number, from: number): Vec2[] =>
    Array.from({ length: n + 1 }, (_, i): Vec2 => {
      const t = from + (i / n) * Math.PI;
      return vertical ? [r * Math.cos(t), sign * c + r * Math.sin(t)] : [sign * c + r * Math.cos(t), r * Math.sin(t)];
    });
  return vertical ? [...cap(1, 0), ...cap(-1, Math.PI)] : [...cap(1, -Math.PI / 2), ...cap(-1, Math.PI / 2)];
}

const PRIMITIVES: Record<Primitive, Vec2[]> = {
  capsule: stadium(0.34, 1),
  barrel: stadium(1, 0.5),
  disc: oval(0, 0, 0.5, 0.5),
  spike: [[-0.2, -0.5], [0.2, -0.5], [0, 0.5]],
  pivot: [],
};

export const kindName = (k: PartKind): string => ("motif" in k ? (k.morph?.label ?? k.motif) : k.primitive);

export const kindExists = (k: PartKind): boolean => ("motif" in k ? Boolean(MOTIFS[k.motif]) : k.primitive in PRIMITIVES);

export function unitPolygon(k: PartKind): Vec2[] {
  if ("primitive" in k) return PRIMITIVES[k.primitive] ?? [];
  if (k.morph) return k.morph.contour;
  return MOTIFS[k.motif]?.silhouette(UNIT) ?? [];
}

function socket(name: string, at: Vec2, accepts: readonly StructuralRole[]): Socket {
  const len = Math.hypot(at[0], at[1]);
  return { name, at, dir: len < 1e-9 ? [0, -1] : [at[0] / len, at[1] / len], accepts };
}

const cache = new Map<string, Socket[]>();

export function socketsOf(k: PartKind): Socket[] {
  const key = kindName(k);
  const hit = cache.get(key);
  if (hit) return hit;
  const center = socket("center", [0, 0], SOCKET_ACCEPTS.center);
  const poly = unitPolygon(k);
  const box = poly.length ? boxAnchors(poly) : {};
  const sides = ["top", "bottom", "left", "right"].filter((s) => box[s]).map((s) => socket(s, box[s], SOCKET_ACCEPTS[s]));
  const sub = "motif" in k && MOTIFS[k.motif] ? MOTIFS[k.motif].parts(0, 0, UNIT).children : [];
  const named = sub.map((c) => socket(c.id.split(".").slice(-1)[0], c.anchors.center ?? Object.values(c.anchors)[0] ?? [0, 0], SUBPART_ACCEPTS[c.role === "opening" ? "opening" : "other"]));
  const out = [center, ...sides, ...named];
  cache.set(key, out);
  return out;
}

export const socketNamed = (k: PartKind, name: string): Socket | undefined => socketsOf(k).find((s) => s.name === name);

export type DrawnPiece = { part: Part; shapes: Shape[]; lod?: DetailChoice };

export function drawKind(k: PartKind, role: StructuralRole, f: BodyFrame, params: Omit<MotifParams, "size">, rng: Rng): DrawnPiece | undefined {
  if ("motif" in k) {
    const motif = MOTIFS[k.motif];
    const morph = k.morph ? { contour: k.morph.contour, features: k.morph.features } : {};
    const lod = params.lodPx ? detailAt(f.s, params.lodPx, params.detail) : undefined;
    const mp: MotifParams = { ...params, ...morph, detail: lod?.detail ?? params.detail, size: f.s, mirror: f.flip, ...(f.rot ? { rotate: f.rot } : {}) };
    return { part: { ...motif.parts(f.o[0], f.o[1], mp), role }, shapes: motif.draw(f.o[0], f.o[1], mp, rng).shapes, ...(lod ? { lod } : {}) };
  }
  if (k.primitive === "pivot") return undefined;
  const poly = PRIMITIVES[k.primitive].map((p) => toWorld(f, p));
  const style = filled(params.fill, params.ink, Math.max(1, f.s * BODY_TUNING.inkRatio), { join: "round" });
  return { part: { id: k.primitive, role, geometryId: k.primitive, anchors: boxAnchors(poly), mask: poly, children: [] }, shapes: [polygon(poly, style)] };
}
