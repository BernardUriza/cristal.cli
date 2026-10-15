import type { TechConfig } from "../config/types.ts";
import type { Vec2 } from "../domain/shapes.ts";

export type View = {
  cx: number;
  hy: number;
  f: number;
  camH: number;
  scaleAt: (z: number) => number;
  project: (x: number, y: number, z: number) => Vec2;
};

export type Facade = { X: (x: number) => number; Y: (y: number) => number; s: number; sw: number };

export function makeView(tech: TechConfig, referenceZ: number): View {
  const cx = tech.width / 2;
  const hy = tech.height * tech.projection.horizon;
  const f = tech.width * tech.projection.focal;
  const camH = tech.projection.camHeight;
  const scaleAt = tech.projection.kind === "perspective" ? (z: number) => f / z : () => f / referenceZ;
  return { cx, hy, f, camH, scaleAt, project: (x, y, z) => [cx + x * scaleAt(z), hy + (camH - y) * scaleAt(z)] };
}

export function facade(view: View, z: number): Facade {
  const s = view.scaleAt(z);
  return { X: (x) => view.cx + x * s, Y: (y) => view.hy + (view.camH - y) * s, s, sw: Math.max(0.4, Math.min(1.4, s / 40)) };
}
