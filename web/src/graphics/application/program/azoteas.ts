import { filled, polygon, type Shape, type Vec2 } from "../../domain/shapes.ts";
import type { TaggedFace } from "../drawings/faces.ts";
import type { PatioContext } from "../patio/types.ts";
import type { ProgramScene } from "./scene.ts";

const CELL = 1.2;
const LIFT = 0.01;
const LOZENGE = 2.4;
const FLAT: readonly string[] = ["chamber", "gallery", "bridge"];

export function isFlatRoof(face: TaggedFace, s: ProgramScene): boolean {
  if (face.normal[1] < 0.9 || face.solid.tag.kind === "floor" || face.solid.tag.kind === "tower-roof") return false;
  const space = s.layout.spaces.find((p) => p.node.id === face.solid.tag.space);
  return !!space && FLAT.includes(space.node.kind);
}

/** A flat roof is a small plaza paved like the courtyard: a checkered rim of cells and, with density, lozenges on its field; cells too small on screen are left out. */
export function roofDecor(face: TaggedFace, ctx: PatioContext): Shape[] {
  const xs = face.points.map((p) => p[0]);
  const zs = face.points.map((p) => p[2]);
  const y = face.points[0][1] + LIFT;
  const [x0, x1, z0, z1] = [Math.min(...xs), Math.max(...xs), Math.min(...zs), Math.max(...zs)];
  const at = (x: number, z: number): Vec2 => ctx.projector.toScreen([x, y, z]);
  const quad = (a: number, b: number, c: number, d: number): Vec2[] => [at(a, b), at(c, b), at(c, d), at(a, d)];
  const out: Shape[] = [];
  const cellPx = CELL * ctx.projector.pxPerMeter;
  if (!ctx.lod.shows(cellPx, 4)) return out;
  const nx = Math.max(2, Math.round((x1 - x0) / CELL));
  const nz = Math.max(2, Math.round((z1 - z0) / CELL));
  const cx = (x1 - x0) / nx;
  const cz = (z1 - z0) / nz;
  const rim = Math.min(cx, cz) * 0.5;
  const cell = (i: number, j: number, a: number, b: number, c: number, d: number) => polygon(quad(a, b, c, d), filled((i + j) % 2 === 0 ? ctx.pal.floorA : ctx.pal.floorB, ctx.pal.ink, 0.3));
  for (let i = 0; i < nx; i++) out.push(cell(i, 0, x0 + i * cx, z0, x0 + (i + 1) * cx, z0 + rim), cell(i, 1, x0 + i * cx, z1 - rim, x0 + (i + 1) * cx, z1));
  for (let j = 1; j < nz - 1; j++) out.push(cell(0, j, x0, z0 + j * cz, x0 + rim, z0 + (j + 1) * cz), cell(1, j, x1 - rim, z0 + j * cz, x1, z0 + (j + 1) * cz));
  if (ctx.config.density < 0.5) return out;
  for (let x = x0 + rim + LOZENGE / 2; x + LOZENGE / 2 <= x1 - rim + 1e-6; x += LOZENGE) {
    for (let z = z0 + rim + LOZENGE / 2; z + LOZENGE / 2 <= z1 - rim + 1e-6; z += LOZENGE) {
      const h = LOZENGE * 0.35;
      out.push(polygon([at(x, z - h), at(x + h, z), at(x, z + h), at(x - h, z)], filled(ctx.pal.secondary, ctx.pal.ink, 0.3)));
    }
  }
  return out;
}
